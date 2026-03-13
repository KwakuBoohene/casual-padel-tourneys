import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

import type { AuthUser } from "./authTypes.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    reply.status(500);
    throw new Error("JWT_SECRET is not configured.");
  }

  const header = request.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    reply.status(401);
    throw new Error("Missing Authorization header.");
  }

  const token = header.slice("bearer ".length);
  try {
    const payload = jwt.verify(token, secret) as { sub?: string; email?: string; name?: string };
    if (!payload.sub || !payload.email) {
      reply.status(401);
      throw new Error("Invalid token payload.");
    }
    request.user = { id: payload.sub, email: payload.email, name: payload.name };
  } catch (error) {
    reply.status(401);
    throw new Error("Invalid or expired token.");
  }
}


