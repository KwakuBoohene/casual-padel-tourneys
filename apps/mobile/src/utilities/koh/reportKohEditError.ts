import { isEmailVerifyRequired } from "../../api/errors";

export function reportKohEditError(
  error: unknown,
  markEmailVerifyRequired: (dueAt?: number) => void,
  setErrorText: (value: string) => void
): void {
  if (isEmailVerifyRequired(error)) {
    markEmailVerifyRequired(error.verifyBy);
    return;
  }
  setErrorText((error as Error).message);
}
