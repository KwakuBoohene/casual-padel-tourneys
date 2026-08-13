import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OAuth2Client } from "google-auth-library";
import {
  attachEmailSchema,
  attachGoogleSchema,
  attachPasswordRegisterFinishSchema,
  attachPasswordRegisterStartSchema
} from "@padel/shared";

import { requireAuth, signAuthToken, toAuthUser } from "../lib/auth.js";
import type { AuthUser } from "../lib/authTypes.js";
import { getMailer } from "../lib/mail/index.js";
import { createMagicToken } from "../lib/magicTokens.js";
import { logger } from "../lib/logger.js";
import {
  ensurePasswordProtocolReady,
  getPasswordServerSetup,
  passwordProtocol
} from "../lib/passwordProtocol.js";
import { prisma } from "../lib/prisma.js";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const VERIFY_DUE_MS = 24 * 60 * 60 * 1000;
const CONFLICT_MESSAGE = "That account is already in use.";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildMagicLinkUrl(rawToken: string): string {
  const base = process.env.AUTH_MAGIC_LINK_BASE_URL?.trim() || "padel://auth/magic";
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(rawToken)}`;
}

function authResponse(user: {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
  avatarUrl?: string | null;
  emailVerifiedAt?: Date | null;
  emailVerificationDueAt?: Date | null;
}): { token: string; user: AuthUser & { avatarUrl?: string } } {
  return {
    token: signAuthToken(user),
    user: {
      ...toAuthUser(user),
      avatarUrl: user.avatarUrl ?? undefined
    }
  };
}

function getGoogleAudiences(): string[] {
  const configuredAudiences = [
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID
  ];
  return Array.from(
    new Set(
      configuredAudiences
        .flatMap((value) => value?.split(",") ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

async function requireGuestUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ id: string; guestId: string | null; email: string } | null> {
  if (!request.user?.isGuest) {
    reply.status(400);
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: request.user.id } });
  if (!user || !user.isGuest) {
    reply.status(400);
    return null;
  }
  return user;
}

export async function registerAttachAuthRoutes(server: FastifyInstance): Promise<void> {
  const googleAudiences = getGoogleAudiences();
  const googleClient = googleAudiences.length > 0 ? new OAuth2Client() : null;

  server.post(
    "/auth/attach/email",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = attachEmailSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }

      const guest = await requireGuestUser(request, reply);
      if (!guest) {
        return { message: "Only guest accounts can attach an email." };
      }

      const email = normalizeEmail(parsed.data.email);
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== guest.id) {
        reply.status(409);
        return { message: CONFLICT_MESSAGE };
      }

      const now = new Date();
      const user = await prisma.user.update({
        where: { id: guest.id },
        data: {
          email,
          emailVerificationDueAt: new Date(now.getTime() + VERIFY_DUE_MS),
          // Stay guest until magic-link consume / password finish / google attach completes.
          isGuest: true
        }
      });

      try {
        const { rawToken, tokenHash } = createMagicToken();
        await prisma.magicLinkToken.create({
          data: {
            userId: user.id,
            tokenHash,
            purpose: "VERIFY",
            expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS)
          }
        });
        const link = buildMagicLinkUrl(rawToken);
        await getMailer().send({
          to: email,
          subject: "Confirm your Casual Padel email",
          text: `Confirm your email to keep your tournaments (expires in 15 minutes):\n\n${link}\n`,
          html: `<p>Confirm your email to keep your tournaments (expires in 15 minutes):</p><p><a href="${link}">Confirm email</a></p>`
        });
        logger.info("POST /auth/attach/email: sent", { userId: user.id });
      } catch (error) {
        logger.error("POST /auth/attach/email: send failed", {
          errorName: (error as Error).name
        });
      }

      return {
        message: "Check your email to confirm and keep this account.",
        user: toAuthUser(user)
      };
    }
  );

  server.post(
    "/auth/attach/google",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = attachGoogleSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }

      const guest = await requireGuestUser(request, reply);
      if (!guest) {
        return { message: "Only guest accounts can attach Google." };
      }

      if (!googleClient || googleAudiences.length === 0) {
        reply.status(500);
        return { message: "Google auth is not configured on the server." };
      }

      let googleId: string;
      let email: string;
      let name: string;
      let avatarUrl: string | undefined;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: parsed.data.idToken,
          audience: googleAudiences
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email) {
          reply.status(401);
          return { message: "Invalid Google token." };
        }
        googleId = payload.sub;
        email = normalizeEmail(payload.email);
        name = payload.name ?? email;
        avatarUrl = payload.picture ?? undefined;
      } catch {
        reply.status(401);
        return { message: "Invalid Google token." };
      }

      const byGoogle = await prisma.user.findUnique({ where: { googleId } });
      if (byGoogle && byGoogle.id !== guest.id) {
        reply.status(409);
        return { message: CONFLICT_MESSAGE };
      }

      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail && byEmail.id !== guest.id && !byEmail.isGuest) {
        reply.status(409);
        return { message: CONFLICT_MESSAGE };
      }
      if (byEmail && byEmail.id !== guest.id && byEmail.isGuest) {
        reply.status(409);
        return { message: CONFLICT_MESSAGE };
      }

      const verifiedAt = new Date();
      const user = await prisma.user.update({
        where: { id: guest.id },
        data: {
          googleId,
          email,
          name,
          avatarUrl,
          emailVerifiedAt: verifiedAt,
          isGuest: false
          // guestId retained
        }
      });

      logger.info("POST /auth/attach/google: attached", { userId: user.id });
      return authResponse(user);
    }
  );

  server.post(
    "/auth/attach/password/register/start",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = attachPasswordRegisterStartSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }

      const guest = await requireGuestUser(request, reply);
      if (!guest) {
        return { message: "Only guest accounts can attach a password." };
      }

      let serverSetup: string;
      try {
        await ensurePasswordProtocolReady();
        serverSetup = getPasswordServerSetup();
      } catch {
        reply.status(500);
        return { message: "Password authentication is not configured." };
      }

      const email = normalizeEmail(parsed.data.email);
      const existing = await prisma.user.findUnique({
        where: { email },
        include: { opaqueRecord: true }
      });
      if (existing && existing.id !== guest.id) {
        reply.status(409);
        return { message: CONFLICT_MESSAGE };
      }

      const now = new Date();
      const user = await prisma.user.update({
        where: { id: guest.id },
        data: {
          email,
          emailVerificationDueAt: new Date(now.getTime() + VERIFY_DUE_MS),
          isGuest: true
        },
        include: { opaqueRecord: true }
      });

      if (user.opaqueRecord) {
        reply.status(409);
        return { message: "Password already set for this account." };
      }

      try {
        const { registrationResponse } = passwordProtocol.createRegistrationResponse({
          serverSetup,
          userIdentifier: user.id,
          registrationRequest: parsed.data.registrationRequest
        });
        return { registrationResponse };
      } catch (error) {
        logger.error("POST /auth/attach/password/register/start: failed", {
          errorName: (error as Error).name
        });
        reply.status(400);
        return { message: "Could not start password registration." };
      }
    }
  );

  server.post(
    "/auth/attach/password/register/finish",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = attachPasswordRegisterFinishSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }

      const guest = await requireGuestUser(request, reply);
      if (!guest) {
        return { message: "Only guest accounts can attach a password." };
      }

      try {
        await ensurePasswordProtocolReady();
        getPasswordServerSetup();
      } catch {
        reply.status(500);
        return { message: "Password authentication is not configured." };
      }

      const email = normalizeEmail(parsed.data.email);
      const user = await prisma.user.findUnique({
        where: { id: guest.id },
        include: { opaqueRecord: true }
      });
      if (!user || normalizeEmail(user.email) !== email) {
        reply.status(400);
        return { message: "Could not complete password registration." };
      }
      if (user.opaqueRecord) {
        reply.status(409);
        return { message: "Password already set for this account." };
      }

      const now = new Date();
      await prisma.opaqueRecord.create({
        data: {
          userId: user.id,
          envelope: parsed.data.registrationRecord
        }
      });

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          isGuest: false,
          emailVerificationDueAt: user.emailVerificationDueAt ?? new Date(now.getTime() + VERIFY_DUE_MS)
        }
      });

      logger.info("POST /auth/attach/password/register/finish: attached", { userId: updated.id });
      return authResponse(updated);
    }
  );
}
