import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  passwordLoginFinishSchema,
  passwordLoginStartSchema,
  passwordRegisterFinishSchema,
  passwordRegisterStartSchema
} from "@padel/shared";

import { finishPasswordLogin, startPasswordLogin } from "../application/passwordLogin.js";
import {
  finishPasswordRegistration,
  startPasswordRegistration
} from "../application/passwordRegister.js";
import type { AuthModuleDeps } from "../application/ports.js";
import { mapAuthError } from "./mapAuthError.js";
import { AUTH_CREDENTIAL_RATE_LIMIT } from "./rateLimits.js";

export function registerPasswordAuthRoutes(server: FastifyInstance, deps: AuthModuleDeps): void {
  server.post(
    "/auth/password/register/start",
    { config: AUTH_CREDENTIAL_RATE_LIMIT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = passwordRegisterStartSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      try {
        return await startPasswordRegistration(deps, parsed.data);
      } catch (error) {
        return mapAuthError(reply, error);
      }
    }
  );

  server.post(
    "/auth/password/register/finish",
    { config: AUTH_CREDENTIAL_RATE_LIMIT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = passwordRegisterFinishSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      try {
        await finishPasswordRegistration(deps, parsed.data);
        return { ok: true };
      } catch (error) {
        return mapAuthError(reply, error);
      }
    }
  );

  server.post(
    "/auth/password/login/start",
    { config: AUTH_CREDENTIAL_RATE_LIMIT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = passwordLoginStartSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      try {
        return await startPasswordLogin(deps, parsed.data);
      } catch (error) {
        return mapAuthError(reply, error);
      }
    }
  );

  server.post(
    "/auth/password/login/finish",
    { config: AUTH_CREDENTIAL_RATE_LIMIT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = passwordLoginFinishSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      try {
        return await finishPasswordLogin(deps, parsed.data);
      } catch (error) {
        return mapAuthError(reply, error);
      }
    }
  );
}
