import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

import type { AuthUser } from "./authTypes.js";
import { logger } from "./logger.js";
import { prisma } from "./prisma.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export type AuthTokenSource = {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
  emailVerifiedAt?: Date | null;
  emailVerificationDueAt?: Date | null;
};

export function toAuthUser(user: AuthTokenSource): AuthUser {
  const emailVerified = Boolean(user.emailVerifiedAt);
  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    isGuest: user.isGuest,
    emailVerified
  };
  if (!emailVerified && user.emailVerificationDueAt) {
    authUser.verifyBy = user.emailVerificationDueAt.getTime();
  }
  return authUser;
}

export function signAuthToken(user: AuthTokenSource): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  const authUser = toAuthUser(user);
  return jwt.sign(
    {
      sub: authUser.id,
      email: authUser.email,
      name: authUser.name,
      isGuest: Boolean(authUser.isGuest),
      emailVerified: Boolean(authUser.emailVerified),
      ...(authUser.verifyBy != null ? { verifyBy: authUser.verifyBy } : {})
    },
    secret,
    { expiresIn: "7d" }
  );
}

/** Returns the authenticated user or null — does not set reply status. */
export function tryAuthUser(request: FastifyRequest): AuthUser | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }

  const header = request.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = header.slice("bearer ".length);
  try {
    const payload = jwt.verify(token, secret) as {
      sub?: string;
      email?: string;
      name?: string;
      isGuest?: boolean;
      emailVerified?: boolean;
      verifyBy?: number;
    };
    if (!payload.sub || !payload.email) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      isGuest: payload.isGuest,
      emailVerified: payload.emailVerified,
      verifyBy: payload.verifyBy
    };
  } catch {
    return null;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    reply.status(500);
    logger.error("requireAuth: JWT_SECRET missing");
    throw new Error("JWT_SECRET is not configured.");
  }

  const header = request.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    reply.status(401);
    logger.warn("requireAuth: missing or invalid Authorization header", {
      path: request.url,
      method: request.method
    });
    throw new Error("Missing Authorization header.");
  }

  const user = tryAuthUser(request);
  if (!user) {
    reply.status(401);
    logger.warn("requireAuth: token verification failed", {
      path: request.url,
      method: request.method
    });
    throw new Error("Invalid or expired token.");
  }
  request.user = user;
}

/**
 * Blocks organizer routes after emailVerificationDueAt until emailVerifiedAt is set.
 * Guests bypass. Uses DB so a fresh verify token works on the next request.
 */
export async function requireVerifiedEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user) {
    reply.status(401);
    throw new Error("Unauthenticated.");
  }
  if (request.user.isGuest) {
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: request.user.id } });
  if (!user) {
    // Authenticated JWT without a persisted profile (legacy / in-memory-only) — no verify clock to enforce.
    return;
  }
  if (user.isGuest || user.emailVerifiedAt) {
    return;
  }
  if (!user.emailVerificationDueAt || Date.now() < user.emailVerificationDueAt.getTime()) {
    return;
  }

  logger.warn("requireVerifiedEmail: gate blocked", { userId: user.id });
  return reply.status(403).send({
    code: "EMAIL_VERIFY_REQUIRED",
    message: "Email verification required.",
    verifyBy: user.emailVerificationDueAt.getTime()
  });
}

/** Organizer routes: auth + verify gate. */
export const requireOrganizerAccess = [requireAuth, requireVerifiedEmail];
