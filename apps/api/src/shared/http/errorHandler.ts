import type { FastifyInstance } from "fastify";

import { isAppError } from "../kernel/appError.js";

/**
 * Last line of defence for use-case failures that a route forgot to catch: an escaped
 * AppError becomes its declared status with the same `{ message }` body routes already
 * return through `mapAppError`.
 *
 * Anything else is handed back to Fastify (`reply.send(error)` re-enters the default
 * handler), which preserves the `{ statusCode, error, message }` envelope that auth routes
 * and the rate limiter rely on.
 */
export function registerAppErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler((error, request, reply) => {
    if (isAppError(error)) {
      request.log.warn(
        { code: error.code, status: error.httpStatus },
        "request failed with AppError"
      );
      reply.status(error.httpStatus).send({ message: error.message });
      return;
    }
    reply.send(error);
  });
}
