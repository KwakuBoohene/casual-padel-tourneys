import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  passwordResetConsumeSchema,
  passwordResetRegisterFinishSchema,
  passwordResetRegisterStartSchema,
  passwordResetRequestSchema
} from "@padel/shared";

import {
  consumePasswordResetLink,
  finishPasswordResetRegistration,
  requestPasswordReset,
  startPasswordResetRegistration
} from "../application/passwordReset.js";
import type { AuthModuleDeps } from "../application/ports.js";
import { AUTH_MESSAGES } from "../domain/authPolicy.js";
import { mapAuthError } from "./mapAuthError.js";
import {
  AUTH_CREDENTIAL_RATE_LIMIT,
  AUTH_EMAIL_SEND_RATE_LIMIT,
  AUTH_TOKEN_CONSUME_RATE_LIMIT
} from "./rateLimits.js";

export function registerPasswordResetRoutes(server: FastifyInstance, deps: AuthModuleDeps): void {
  server.post(
    "/auth/password/reset",
    { config: AUTH_EMAIL_SEND_RATE_LIMIT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = passwordResetRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }

      await requestPasswordReset(deps, parsed.data);
      reply.status(200);
      return { message: AUTH_MESSAGES.genericResetRequest };
    }
  );

  server.post(
    "/auth/password/reset/consume",
    { config: AUTH_TOKEN_CONSUME_RATE_LIMIT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = passwordResetConsumeSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      try {
        return await consumePasswordResetLink(deps, parsed.data);
      } catch (error) {
        return mapAuthError(reply, error);
      }
    }
  );

  server.post(
    "/auth/password/reset/register/start",
    { config: AUTH_CREDENTIAL_RATE_LIMIT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = passwordResetRegisterStartSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      try {
        return await startPasswordResetRegistration(deps, parsed.data);
      } catch (error) {
        return mapAuthError(reply, error);
      }
    }
  );

  server.post(
    "/auth/password/reset/register/finish",
    { config: AUTH_CREDENTIAL_RATE_LIMIT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = passwordResetRegisterFinishSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      try {
        return await finishPasswordResetRegistration(deps, parsed.data);
      } catch (error) {
        return mapAuthError(reply, error);
      }
    }
  );
}
