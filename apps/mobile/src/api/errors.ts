export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly verifyBy?: number;

  constructor(input: { message: string; status: number; code?: string; verifyBy?: number }) {
    super(input.message);
    this.name = "ApiError";
    this.status = input.status;
    this.code = input.code;
    this.verifyBy = input.verifyBy;
  }
}

export function isEmailVerifyRequired(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "EMAIL_VERIFY_REQUIRED";
}
