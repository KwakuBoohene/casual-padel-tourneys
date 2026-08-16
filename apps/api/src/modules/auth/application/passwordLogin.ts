import { logger } from "../../../lib/logger.js";
import { unauthorized, validation } from "../../../shared/kernel/appError.js";
import { AUTH_MESSAGES } from "../domain/authPolicy.js";
import { normalizeEmail } from "../domain/email.js";
import { authSession, requireTokenIssuer, type AuthSession } from "./authSession.js";
import type { AuthModuleDeps } from "./ports.js";
import { requirePasswordProtocol } from "./passwordSupport.js";

/**
 * Runs the OPAQUE exchange even for unknown emails so response timing and shape do
 * not reveal whether the account exists; only a real envelope binds a userId.
 */
export async function startPasswordLogin(
  deps: AuthModuleDeps,
  input: { email: string; startLoginRequest: string }
): Promise<{ loginResponse: string; loginId: string }> {
  await requirePasswordProtocol(deps);

  const email = normalizeEmail(input.email);
  const user = await deps.users.findByEmail(email);
  const registrationRecord = user ? await deps.users.getPasswordEnvelope(user.id) : null;

  try {
    const { loginResponse, serverLoginState } = deps.password.startLogin({
      userIdentifier: user?.id ?? email,
      registrationRecord,
      startLoginRequest: input.startLoginRequest
    });
    const loginId = deps.loginAttempts.store({
      serverLoginState,
      userId: registrationRecord ? (user?.id ?? null) : null
    });
    return { loginResponse, loginId };
  } catch (error) {
    logger.error("auth/password/login/start: failed", {
      errorName: (error as Error).name
    });
    throw validation(AUTH_MESSAGES.passwordLoginStartFailed);
  }
}

export async function finishPasswordLogin(
  deps: AuthModuleDeps,
  input: { email: string; loginId: string; finishLoginRequest: string }
): Promise<AuthSession> {
  await requirePasswordProtocol(deps);
  requireTokenIssuer(deps);

  const attempt = deps.loginAttempts.take(input.loginId);
  if (!attempt?.userId) {
    throw unauthorized(AUTH_MESSAGES.genericLoginFailure);
  }

  try {
    deps.password.finishLogin({
      serverLoginState: attempt.serverLoginState,
      finishLoginRequest: input.finishLoginRequest
    });
  } catch {
    throw unauthorized(AUTH_MESSAGES.genericLoginFailure);
  }

  const user = await deps.users.findById(attempt.userId);
  if (!user || normalizeEmail(user.email) !== normalizeEmail(input.email)) {
    throw unauthorized(AUTH_MESSAGES.genericLoginFailure);
  }

  logger.info("auth/password/login/finish: signed in", { userId: user.id });
  return authSession(deps.tokens, user);
}
