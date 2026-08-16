import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  attachPasswordRegisterFinishSchema,
  attachPasswordRegisterStartSchema
} from "@padel/shared";

import { finishAttachPassword, startAttachPassword } from "../application/attachPassword.js";
import type { AuthModuleDeps } from "../application/ports.js";
import { mapAuthError } from "./mapAuthError.js";
import { requireAuth } from "./preHandlers.js";

export function registerAttachPasswordRoutes(
  server: FastifyInstance,
  deps: AuthModuleDeps
): void {
  server.post(
    "/auth/attach/password/register/start",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = attachPasswordRegisterStartSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        return await startAttachPassword(deps, {
          userId: request.user.id,
          isGuest: Boolean(request.user.isGuest),
          email: parsed.data.email,
          registrationRequest: parsed.data.registrationRequest
        });
      } catch (error) {
        return mapAuthError(reply, error);
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
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        return await finishAttachPassword(deps, {
          userId: request.user.id,
          isGuest: Boolean(request.user.isGuest),
          email: parsed.data.email,
          registrationRecord: parsed.data.registrationRecord
        });
      } catch (error) {
        return mapAuthError(reply, error);
      }
    }
  );
}
