import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OAuth2Client } from "google-auth-library";

import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../lib/authTypes.js";
import { requireAuth, signAuthToken, toAuthUser } from "../lib/auth.js";
import { getMailer } from "../lib/mail/index.js";
import { createMagicToken } from "../lib/magicTokens.js";
import { logger } from "../lib/logger.js";

interface GoogleAuthBody {
  idToken: string;
}

interface GuestAuthBody {
  guestId: string;
}

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

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
  const token = signAuthToken(user);
  const authUser = toAuthUser(user);
  return {
    token,
    user: {
      ...authUser,
      avatarUrl: user.avatarUrl ?? undefined
    }
  };
}

export async function registerAuthRoutes(server: FastifyInstance): Promise<void> {
  const googleAudiences = getGoogleAudiences();

  const googleClient = googleAudiences.length > 0 ? new OAuth2Client() : null;

  server.post(
    "/auth/google",
    async (
      request: FastifyRequest<{ Body: GoogleAuthBody }>,
      reply: FastifyReply
    ): Promise<{ token: string; user: AuthUser & { avatarUrl?: string } }> => {
      if (!googleClient || googleAudiences.length === 0 || !process.env.JWT_SECRET) {
        reply.status(500);
        logger.error("POST /auth/google: Google auth not configured", {
          hasClient: Boolean(googleClient),
          googleAudienceCount: googleAudiences.length,
          hasJwtSecret: Boolean(process.env.JWT_SECRET)
        });
        throw new Error("Google auth is not configured on the server.");
      }

      const { idToken } = request.body;
      if (!idToken) {
        reply.status(400);
        logger.warn("POST /auth/google: missing idToken");
        throw new Error("Missing idToken.");
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: googleAudiences
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        reply.status(401);
        logger.warn("POST /auth/google: invalid Google token payload");
        throw new Error("Invalid Google token.");
      }

      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name ?? email;
      const avatarUrl = payload.picture ?? undefined;
      const verifiedAt = new Date();

      const user = await prisma.user.upsert({
        where: { googleId },
        create: {
          googleId,
          email,
          name,
          avatarUrl,
          emailVerifiedAt: verifiedAt,
          isGuest: false
        },
        update: {
          email,
          name,
          avatarUrl,
          emailVerifiedAt: verifiedAt,
          isGuest: false
        }
      });

      logger.info("POST /auth/google: user authenticated", { userId: user.id, email: user.email });
      return authResponse(user);
    }
  );

  server.post(
    "/auth/guest",
    async (
      request: FastifyRequest<{ Body: GuestAuthBody }>,
      reply: FastifyReply
    ): Promise<{ token: string; user: AuthUser & { avatarUrl?: string } }> => {
      if (!process.env.JWT_SECRET) {
        reply.status(500);
        logger.error("POST /auth/guest: JWT_SECRET missing");
        throw new Error("JWT_SECRET is not configured.");
      }

      const { guestId } = request.body;
      if (!guestId || typeof guestId !== "string" || guestId.trim().length === 0) {
        reply.status(400);
        logger.warn("POST /auth/guest: missing guestId");
        throw new Error("Missing guestId.");
      }
      if (!/^[a-zA-Z0-9_-]{8,128}$/.test(guestId)) {
        reply.status(400);
        logger.warn("POST /auth/guest: invalid guestId format");
        throw new Error("Invalid guestId format.");
      }

      const guestEmail = `guest-${guestId}@padel.local`;

      let user = await prisma.user.findUnique({ where: { guestId } });
      if (!user) {
        const suffix = String(Math.floor(1000 + Math.random() * 9000));
        user = await prisma.user.create({
          data: {
            guestId,
            email: guestEmail,
            name: `Guest ${suffix}`,
            isGuest: true
          }
        });
        logger.info("POST /auth/guest: new guest created", { userId: user.id });
      } else {
        logger.info("POST /auth/guest: returning guest authenticated", { userId: user.id });
      }

      return authResponse(user);
    }
  );

  server.get(
    "/auth/me",
    { preHandler: requireAuth },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<{ user: AuthUser & { avatarUrl?: string } }> => {
      if (!request.user) {
        reply.status(401);
        logger.warn("GET /auth/me: no user on request");
        throw new Error("Unauthenticated.");
      }
      const userRecord = await prisma.user.findUnique({
        where: { id: request.user.id }
      });
      if (!userRecord) {
        reply.status(404);
        logger.warn("GET /auth/me: user not found", { userId: request.user.id });
        throw new Error("User not found.");
      }
      return {
        user: {
          ...toAuthUser(userRecord),
          avatarUrl: userRecord.avatarUrl ?? undefined
        }
      };
    }
  );

  server.post(
    "/auth/verify/resend",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "15 minutes"
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user || request.user.isGuest) {
        reply.status(400);
        return { message: "Verification is not available for this account." };
      }

      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || user.isGuest) {
        reply.status(400);
        return { message: "Verification is not available for this account." };
      }

      const message = "If your account needs verification, a link is on the way.";
      if (user.emailVerifiedAt) {
        return { message };
      }

      try {
        const { rawToken, tokenHash } = createMagicToken();
        await prisma.magicLinkToken.create({
          data: {
            userId: user.id,
            tokenHash,
            purpose: "VERIFY",
            expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS)
          }
        });

        const link = buildMagicLinkUrl(rawToken);
        await getMailer().send({
          to: user.email,
          subject: "Verify your Casual Padel email",
          text: `Verify your email (expires in 15 minutes):\n\n${link}\n`,
          html: `<p>Verify your email (expires in 15 minutes):</p><p><a href="${link}">Verify email</a></p>`
        });
        logger.info("POST /auth/verify/resend: sent", { userId: user.id });
      } catch (error) {
        logger.error("POST /auth/verify/resend: failed", {
          errorName: (error as Error).name
        });
      }

      reply.status(200);
      return { message };
    }
  );
}
