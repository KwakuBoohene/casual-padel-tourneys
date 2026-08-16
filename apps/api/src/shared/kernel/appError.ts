/**
 * Typed application / domain failures. No Fastify imports.
 * Convention for epic-09+: throw AppError from use-cases; map in HTTP via mapAppError.
 */

export type AppErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, httpStatus: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export function notFound(message: string, details?: unknown): AppError {
  return new AppError("NOT_FOUND", 404, message, details);
}

export function conflict(message: string, details?: unknown): AppError {
  return new AppError("CONFLICT", 409, message, details);
}

export function forbidden(message: string, details?: unknown): AppError {
  return new AppError("FORBIDDEN", 403, message, details);
}

export function validation(message: string, details?: unknown): AppError {
  return new AppError("VALIDATION", 400, message, details);
}

export function unauthorized(message: string, details?: unknown): AppError {
  return new AppError("UNAUTHORIZED", 401, message, details);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
