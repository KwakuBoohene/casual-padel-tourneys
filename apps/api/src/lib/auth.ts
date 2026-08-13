import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

import type { AuthUser } from "./authTypes.js";
import { logger } from "./logger.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
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
    };
    if (!payload.sub || !payload.email) {
      return null;
    }
    return { id: payload.sub, email: payload.email, name: payload.name, isGuest: payload.isGuest };
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


