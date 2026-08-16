import type { FastifyReply } from "fastify";

import { isAppError } from "../../../shared/kernel/appError.js";

/**
 * JSON-body style: `{ message }` at the AppError status, used by every auth route that
 * already answered with a plain object. Unexpected failures are rethrown so Fastify
 * still turns them into an opaque 500 rather than leaking internals as a message.
 */
export function mapAuthError(reply: FastifyReply, error: unknown): { message: string } {
  if (!isAppError(error)) {
    throw error;
  }
  reply.status(error.httpStatus);
  return { message: error.message };
}

/**
 * Throw style: sets the status then rethrows so Fastify serialises the
 * `{ statusCode, error, message }` envelope that `/auth/google`, `/auth/guest` and
 * `/auth/me` have always returned.
 */
export function rethrowAuthError(reply: FastifyReply, error: unknown): never {
  if (isAppError(error)) {
    reply.status(error.httpStatus);
    throw new Error(error.message);
  }
  throw error;
}
