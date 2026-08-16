import { AppError } from "../../../shared/kernel/appError.js";
import { AUTH_MESSAGES } from "../domain/authPolicy.js";
import type { AuthModuleDeps } from "./ports.js";

/** Never surfaces the underlying OPAQUE/env failure to the client. */
export async function requirePasswordProtocol(deps: AuthModuleDeps): Promise<void> {
  try {
    await deps.password.ensureReady();
  } catch {
    throw new AppError("INTERNAL", 500, AUTH_MESSAGES.passwordNotConfigured);
  }
}
