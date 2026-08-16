import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { attachEmailSchema, attachGoogleSchema } from "@padel/shared";

import { attachEmail, attachGoogle } from "../application/attachIdentity.js";
import type { AuthModuleDeps } from "../application/ports.js";
import { mapAuthError } from "./mapAuthError.js";
import { requireAuth } from "./preHandlers.js";

export function registerAttachIdentityRoutes(
  server: FastifyInstance,
  deps: AuthModuleDeps
): void {
  server.post(
    "/auth/attach/email",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = attachEmailSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        return await attachEmail(deps, {
          userId: request.user.id,
          isGuest: Boolean(request.user.isGuest),
          email: parsed.data.email
        });
      } catch (error) {
        return mapAuthError(reply, error);
      }
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
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        return await attachGoogle(deps, {
          userId: request.user.id,
          isGuest: Boolean(request.user.isGuest),
          idToken: parsed.data.idToken
        });
      } catch (error) {
        return mapAuthError(reply, error);
      }
    }
  );
}
