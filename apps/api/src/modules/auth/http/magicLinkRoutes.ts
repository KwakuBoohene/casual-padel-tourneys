import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { consumeMagicLinkSchema, requestMagicLinkSchema } from "@padel/shared";

import { consumeMagicLink, requestMagicLink } from "../application/magicLink.js";
import type { AuthModuleDeps } from "../application/ports.js";
import { AUTH_MESSAGES } from "../domain/authPolicy.js";
import { mapAuthError } from "./mapAuthError.js";

export function registerMagicLinkRoutes(server: FastifyInstance, deps: AuthModuleDeps): void {
  server.post("/auth/magic-link", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = requestMagicLinkSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    await requestMagicLink(deps, parsed.data);
    reply.status(200);
    return { message: AUTH_MESSAGES.genericMagicLinkRequest };
  });

  server.post("/auth/magic-link/consume", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = consumeMagicLinkSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    try {
      return await consumeMagicLink(deps, parsed.data);
    } catch (error) {
      return mapAuthError(reply, error);
    }
  });
}
