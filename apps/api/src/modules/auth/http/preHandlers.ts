import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthUser } from "../../../lib/authTypes.js";
import { logger } from "../../../lib/logger.js";
import { verifyAuthToken } from "../infrastructure/JwtAuthTokens.js";
import { PrismaAuthUserRepository } from "../infrastructure/PrismaAuthUserRepository.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

const users = new PrismaAuthUserRepository();

function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice("bearer ".length);
}

/** Returns the authenticated user or null — does not set reply status. */
export function tryAuthUser(request: FastifyRequest): AuthUser | null {
  const token = bearerToken(request);
  return token ? verifyAuthToken(token) : null;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!process.env.JWT_SECRET) {
    reply.status(500);
    logger.error("requireAuth: JWT_SECRET missing");
    throw new Error("JWT_SECRET is not configured.");
  }

  if (!bearerToken(request)) {
    reply.status(401);
    logger.warn("requireAuth: missing or invalid Authorization header", {
      status: 401,
      path: request.url,
      method: request.method
    });
    throw new Error("Missing Authorization header.");
  }

  const user = tryAuthUser(request);
  if (!user) {
    reply.status(401);
    logger.warn("requireAuth: token verification failed", {
      status: 401,
      path: request.url,
      method: request.method
    });
    throw new Error("Invalid or expired token.");
  }
  request.user = user;
}

/**
 * Blocks organizer routes after emailVerificationDueAt until emailVerifiedAt is set.
 * Guests bypass. Uses the DB so a fresh verify token works on the next request.
 */
export async function requireVerifiedEmail(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    reply.status(401);
    throw new Error("Unauthenticated.");
  }
  if (request.user.isGuest) {
    return;
  }

  const user = await users.findById(request.user.id);
  if (!user) {
    // Authenticated JWT without a persisted profile — no verify clock to enforce.
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
