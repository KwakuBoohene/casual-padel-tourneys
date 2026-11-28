export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly verifyBy?: number;
  /** Parsed JSON error body (e.g. `latest` on DRAFT_VERSION_CONFLICT). */
  readonly body?: Record<string, unknown>;

  constructor(input: {
    message: string;
    status: number;
    code?: string;
    verifyBy?: number;
    body?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "ApiError";
    this.status = input.status;
    this.code = input.code;
    this.verifyBy = input.verifyBy;
    this.body = input.body;
  }
}

export function isEmailVerifyRequired(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "EMAIL_VERIFY_REQUIRED";
}
