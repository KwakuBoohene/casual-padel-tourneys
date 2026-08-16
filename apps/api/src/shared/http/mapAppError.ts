import type { FastifyReply } from "fastify";

import { logger } from "../../lib/logger.js";
import { AppError, isAppError } from "../kernel/appError.js";

/**
 * Map AppError (or legacy Error messages from domain) to an HTTP reply body.
 * Only the HTTP layer imports Fastify.
 */
export function mapAppError(reply: FastifyReply, error: unknown): { message: string } {
  if (isAppError(error)) {
    reply.status(error.httpStatus);
    return { message: error.message };
  }

  if (error instanceof Error) {
    const status = legacyMutationStatus(error.message);
    reply.status(status);
    return { message: error.message };
  }

  logger.error({ err: error }, "Unhandled non-Error thrown");
  reply.status(500);
  return { message: "Internal server error." };
}

/** Preserve status heuristics clients already rely on from fat-route era. */
export function legacyMutationStatus(message: string): number {
  if (message.includes("not found") || message.includes("Not found")) {
    return 404;
  }
  if (message.includes("Version mismatch")) {
    return 409;
  }
  if (
    message.includes("Need at least 2 pending players") ||
    message.includes("Maximum integration waves") ||
    message.includes("Cannot integrate during incomplete round") ||
    message.includes("not complete") ||
    message.includes("tiebreak") ||
    message.includes("submitRegularScore") ||
    message.includes("Use submitRegularScore") ||
    message.includes("REGULAR scoring") ||
    message.includes("regularScoring") ||
    message.includes("Invalid full-set") ||
    message.includes("points body") ||
    message.includes("sets body") ||
    message.includes("later round has started") ||
    message.includes("Finish the current round") ||
    message.includes("advanceMexicanoRound") ||
    message.includes("not supported for Mexicano") ||
    message.includes("Not enough players") ||
    message.includes("Next round already generated") ||
    message.includes("already ended") ||
    message.includes("endMexicanoNight")
  ) {
    return 400;
  }
  return 409;
}

export function sendAppError(reply: FastifyReply, error: unknown): { message: string } {
  return mapAppError(reply, error);
}

// Re-export for callers that construct errors at the edge
export { AppError };
