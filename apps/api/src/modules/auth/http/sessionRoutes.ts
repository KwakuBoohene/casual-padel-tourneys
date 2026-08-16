import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { isAppError } from "../../../shared/kernel/appError.js";
import type { AuthSession } from "../application/authSession.js";
import { googleSignIn } from "../application/googleSignIn.js";
import { guestSignIn } from "../application/guestSignIn.js";
import type { AuthModuleDeps } from "../application/ports.js";
import { mapAuthError, rethrowAuthError } from "./mapAuthError.js";
import { AUTH_CREDENTIAL_RATE_LIMIT } from "./rateLimits.js";

type GoogleAuthBody = { idToken: string };
type GuestAuthBody = { guestId: string };

export function registerAuthSessionRoutes(server: FastifyInstance, deps: AuthModuleDeps): void {
  server.post(
    "/auth/google",
    { config: AUTH_CREDENTIAL_RATE_LIMIT },
    async (
      request: FastifyRequest<{ Body: GoogleAuthBody }>,
      reply: FastifyReply
    ): Promise<AuthSession | { message: string }> => {
      try {
        return await googleSignIn(deps, { idToken: request.body?.idToken });
      } catch (error) {
        // A taken account has always answered with a plain body; the rest use the envelope.
        if (isAppError(error) && error.code === "CONFLICT") {
          return mapAuthError(reply, error);
        }
        return rethrowAuthError(reply, error);
      }
    }
  );

  server.post(
    "/auth/guest",
    { config: AUTH_CREDENTIAL_RATE_LIMIT },
    async (
      request: FastifyRequest<{ Body: GuestAuthBody }>,
      reply: FastifyReply
    ): Promise<AuthSession> => {
      try {
        return await guestSignIn(deps, { guestId: request.body?.guestId });
      } catch (error) {
        return rethrowAuthError(reply, error);
      }
    }
  );
}
