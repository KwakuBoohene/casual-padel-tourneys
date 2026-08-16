import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { AuthModuleDeps } from "../application/ports.js";
import { readAuthMe, resendVerification } from "../application/session.js";
import { AUTH_MESSAGES } from "../domain/authPolicy.js";
import type { AuthUserView } from "../domain/authUser.js";
import { mapAuthError, rethrowAuthError } from "./mapAuthError.js";
import { requireAuth } from "./preHandlers.js";

export function registerAuthMeRoutes(server: FastifyInstance, deps: AuthModuleDeps): void {
  server.get(
    "/auth/me",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply): Promise<{ user: AuthUserView }> => {
      if (!request.user) {
        reply.status(401);
        throw new Error("Unauthenticated.");
      }
      try {
        return await readAuthMe(deps, { userId: request.user.id });
      } catch (error) {
        return rethrowAuthError(reply, error);
      }
    }
  );

  server.post(
    "/auth/verify/resend",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        reply.status(400);
        return { message: AUTH_MESSAGES.verifyUnavailable };
      }
      try {
        await resendVerification(deps, {
          userId: request.user.id,
          isGuest: Boolean(request.user.isGuest)
        });
      } catch (error) {
        return mapAuthError(reply, error);
      }
      reply.status(200);
      return { message: AUTH_MESSAGES.verifySent };
    }
  );
}
