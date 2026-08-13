import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  passwordResetConsumeSchema,
  passwordResetRegisterFinishSchema,
  passwordResetRegisterStartSchema,
  passwordResetRequestSchema
} from "@padel/shared";

import { signAuthToken, toAuthUser } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import { getMailer } from "../lib/mail/index.js";
import { createMagicToken, hashMagicToken } from "../lib/magicTokens.js";
import {
  ensurePasswordProtocolReady,
  getPasswordServerSetup,
  passwordProtocol
} from "../lib/passwordProtocol.js";
import {
  peekPasswordResetTicket,
  storePasswordResetTicket,
  takePasswordResetTicket
} from "../lib/passwordResetTickets.js";
import { prisma } from "../lib/prisma.js";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, a password reset link is on the way.";
const INVALID_RESET = "Invalid or expired password reset link.";
const INVALID_TICKET = "Invalid or expired reset session.";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildPasswordResetUrl(rawToken: string): string {
  const base =
    process.env.AUTH_PASSWORD_RESET_BASE_URL?.trim() ||
    process.env.AUTH_MAGIC_LINK_BASE_URL?.trim() ||
    "padel://auth/reset";
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(rawToken)}`;
}

async function ensureConfigured(reply: FastifyReply): Promise<string | null> {
  try {
    await ensurePasswordProtocolReady();
    return getPasswordServerSetup();
  } catch {
    reply.status(500);
    return null;
  }
}

export async function registerPasswordResetRoutes(server: FastifyInstance): Promise<void> {
  server.post("/auth/password/reset", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = passwordResetRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    const email = normalizeEmail(parsed.data.email);

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user && !user.isGuest) {
        const now = new Date();
        const { rawToken, tokenHash } = createMagicToken();
        await prisma.magicLinkToken.create({
          data: {
            userId: user.id,
            tokenHash,
            purpose: "RESET",
            expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS)
          }
        });

        const link = buildPasswordResetUrl(rawToken);
        await getMailer().send({
          to: email,
          subject: "Reset your Casual Padel password",
          text: `Reset your password with this link (expires in 15 minutes):\n\n${link}\n`,
          html: `<p>Reset your password with this link (expires in 15 minutes):</p><p><a href="${link}">Reset password</a></p>`
        });
      }
    } catch (error) {
      logger.error("POST /auth/password/reset: failed to issue link", {
        errorName: (error as Error).name
      });
    }

    reply.status(200);
    return { message: GENERIC_RESET_MESSAGE };
  });

  server.post("/auth/password/reset/consume", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = passwordResetConsumeSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    const tokenHash = hashMagicToken(parsed.data.token);
    const record = await prisma.magicLinkToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (
      !record ||
      record.consumedAt ||
      record.expiresAt.getTime() <= Date.now() ||
      record.purpose !== "RESET"
    ) {
      reply.status(401);
      return { message: INVALID_RESET };
    }

    const now = new Date();
    await prisma.magicLinkToken.update({
      where: { id: record.id },
      data: { consumedAt: now }
    });

    const resetTicket = storePasswordResetTicket(record.userId);
    logger.info("POST /auth/password/reset/consume: issued reset ticket", {
      userId: record.userId
    });
    return { resetTicket };
  });

  server.post(
    "/auth/password/reset/register/start",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = passwordResetRegisterStartSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }

      const serverSetup = await ensureConfigured(reply);
      if (!serverSetup) {
        return { message: "Password authentication is not configured." };
      }

      const ticket = peekPasswordResetTicket(parsed.data.resetTicket);
      if (!ticket) {
        reply.status(401);
        return { message: INVALID_TICKET };
      }

      try {
        const { registrationResponse } = passwordProtocol.createRegistrationResponse({
          serverSetup,
          userIdentifier: ticket.userId,
          registrationRequest: parsed.data.registrationRequest
        });
        return { registrationResponse };
      } catch (error) {
        logger.error("POST /auth/password/reset/register/start: failed", {
          errorName: (error as Error).name
        });
        reply.status(400);
        return { message: "Could not start password reset." };
      }
    }
  );

  server.post(
    "/auth/password/reset/register/finish",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = passwordResetRegisterFinishSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }

      const serverSetup = await ensureConfigured(reply);
      if (!serverSetup) {
        return { message: "Password authentication is not configured." };
      }

      if (!process.env.JWT_SECRET) {
        reply.status(500);
        logger.error("POST /auth/password/reset/register/finish: JWT_SECRET missing");
        return { message: "Authentication is not configured." };
      }

      const ticket = takePasswordResetTicket(parsed.data.resetTicket);
      if (!ticket) {
        reply.status(401);
        return { message: INVALID_TICKET };
      }

      const now = new Date();
      const user = await prisma.$transaction(async (tx) => {
        await tx.opaqueRecord.deleteMany({ where: { userId: ticket.userId } });
        await tx.opaqueRecord.create({
          data: {
            userId: ticket.userId,
            envelope: parsed.data.registrationRecord
          }
        });
        return tx.user.update({
          where: { id: ticket.userId },
          data: {
            emailVerifiedAt: now,
            isGuest: false
          }
        });
      });

      const token = signAuthToken(user);
      logger.info("POST /auth/password/reset/register/finish: password replaced", {
        userId: user.id
      });
      return {
        token,
        user: {
          ...toAuthUser(user),
          avatarUrl: user.avatarUrl ?? undefined
        }
      };
    }
  );
}
