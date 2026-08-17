import type { FastifyReply } from "fastify";

import { logger } from "../../../lib/logger.js";
import { isAppError } from "../../../shared/kernel/appError.js";

export type KohErrorBody = {
  message: string;
  expectedVersion?: number;
  actualVersion?: number;
};

/** Only the aggregate itself missing yields 404; everything else stays a 400 for KOH clients. */
function isNotFoundMessage(message: string): boolean {
  return (
    message === "King of the Court tournament not found." ||
    message === "KOH tournament not found." ||
    message === "Tournament not found."
  );
}

function versionConflictDetails(
  details: unknown
): { expectedVersion: number; actualVersion: number } | null {
  if (!details || typeof details !== "object") {
    return null;
  }
  const row = details as Record<string, unknown>;
  if (typeof row.expectedVersion !== "number" || typeof row.actualVersion !== "number") {
    return null;
  }
  return { expectedVersion: row.expectedVersion, actualVersion: row.actualVersion };
}

/**
 * KOH-specific error mapping. Keeps the legacy status heuristics plus the
 * `{ message, expectedVersion, actualVersion }` body for version conflicts.
 */
export function mapKohError(
  reply: FastifyReply,
  error: unknown,
  fallbackMessage: string
): KohErrorBody {
  if (isAppError(error)) {
    reply.status(error.httpStatus);
    const version = versionConflictDetails(error.details);
    return version ? { message: error.message, ...version } : { message: error.message };
  }

  if (error instanceof Error) {
    const message = error.message || fallbackMessage;
    reply.status(isNotFoundMessage(message) ? 404 : 400);
    return { message };
  }

  logger.error({ err: error }, "koh/mapKohError unhandled non-Error thrown");
  reply.status(400);
  return { message: fallbackMessage };
}
