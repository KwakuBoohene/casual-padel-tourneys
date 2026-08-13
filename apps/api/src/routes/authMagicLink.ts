import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { consumeMagicLinkSchema, requestMagicLinkSchema } from "@padel/shared";

import { signAuthToken, toAuthUser } from "../lib/auth.js";
import { getMailer, setMailerOverride, type Mailer } from "../lib/mail/index.js";
import { createMagicToken, hashMagicToken } from "../lib/magicTokens.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const VERIFY_DUE_MS = 24 * 60 * 60 * 1000;
const GENERIC_REQUEST_MESSAGE = "If an account exists for that email, a sign-in link is on the way.";

/** @deprecated Use setMailerOverride from lib/mail — kept for existing tests. */
export function setMagicLinkMailerOverride(mailer: Mailer | null): void {
  setMailerOverride(mailer);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Player";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Player";
}

function buildMagicLinkUrl(rawToken: string): string {
  const base = process.env.AUTH_MAGIC_LINK_BASE_URL?.trim() || "padel://auth/magic";
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(rawToken)}`;
}

export async function registerMagicLinkRoutes(server: FastifyInstance): Promise<void> {
  server.post("/auth/magic-link", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = requestMagicLinkSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    const email = normalizeEmail(parsed.data.email);

    try {
      const now = new Date();
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: nameFromEmail(email),
            isGuest: false,
            emailVerificationDueAt: new Date(now.getTime() + VERIFY_DUE_MS)
          }
        });
        logger.info("POST /auth/magic-link: created user for magic link", { userId: user.id });
      }

      const { rawToken, tokenHash } = createMagicToken();
      await prisma.magicLinkToken.create({
        data: {
          userId: user.id,
          tokenHash,
          purpose: "LOGIN",
          expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS)
        }
      });

      const link = buildMagicLinkUrl(rawToken);
      await getMailer().send({
        to: email,
        subject: "Your Casual Padel sign-in link",
        text: `Sign in with this link (expires in 15 minutes):\n\n${link}\n`,
        html: `<p>Sign in with this link (expires in 15 minutes):</p><p><a href="${link}">Open sign-in link</a></p>`
      });
    } catch (error) {
      // Always return generic success to avoid email enumeration / config leakage.
      logger.error("POST /auth/magic-link: failed to issue link", {
        errorId: (error as Error).name
      });
    }

    reply.status(200);
    return { message: GENERIC_REQUEST_MESSAGE };
  });

  server.post("/auth/magic-link/consume", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = consumeMagicLinkSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    if (!process.env.JWT_SECRET) {
      reply.status(500);
      logger.error("POST /auth/magic-link/consume: JWT_SECRET missing");
      return { message: "Authentication is not configured." };
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
      (record.purpose !== "LOGIN" && record.purpose !== "VERIFY")
    ) {
      reply.status(401);
      return { message: "Invalid or expired sign-in link." };
    }

    const now = new Date();
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          emailVerifiedAt: now,
          isGuest: false
        }
      }),
      prisma.magicLinkToken.update({
        where: { id: record.id },
        data: { consumedAt: now }
      })
    ]);

    const token = signAuthToken(user);
    logger.info("POST /auth/magic-link/consume: signed in", {
      userId: user.id,
      purpose: record.purpose
    });
    return {
      token,
      user: {
        ...toAuthUser(user),
        avatarUrl: user.avatarUrl ?? undefined
      }
    };
  });
}
