import { logger } from "../../../lib/logger.js";
import { unauthorized, validation } from "../../../shared/kernel/appError.js";
import { AUTH_MESSAGES, MAGIC_LINK_TTL_MS } from "../domain/authPolicy.js";
import { normalizeEmail } from "../domain/email.js";
import { authSession, requireTokenIssuer, type AuthSession } from "./authSession.js";
import type { AuthModuleDeps } from "./ports.js";
import { requirePasswordProtocol } from "./passwordSupport.js";

/** Silent for unknown or guest accounts — the caller always gets the same message. */
export async function requestPasswordReset(
  deps: AuthModuleDeps,
  input: { email: string }
): Promise<void> {
  const email = normalizeEmail(input.email);
  try {
    const user = await deps.users.findByEmail(email);
    if (!user || user.isGuest) {
      return;
    }
    const rawToken = await deps.magicTokens.issue({
      userId: user.id,
      purpose: "RESET",
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS)
    });
    await deps.notifier.send("PASSWORD_RESET", email, rawToken);
  } catch (error) {
    logger.error("auth/password/reset: failed to issue link", {
      errorName: (error as Error).name
    });
  }
}

/** Trades a one-time reset link for a short-lived ticket; no session is issued yet. */
export async function consumePasswordResetLink(
  deps: AuthModuleDeps,
  input: { token: string }
): Promise<{ resetTicket: string }> {
  const consumed = await deps.magicTokens.consumeReset(input.token);
  if (!consumed) {
    throw unauthorized(AUTH_MESSAGES.invalidResetLink);
  }
  logger.info("auth/password/reset/consume: issued reset ticket", {
    userId: consumed.userId
  });
  return { resetTicket: deps.resetTickets.store(consumed.userId) };
}

export async function startPasswordResetRegistration(
  deps: AuthModuleDeps,
  input: { resetTicket: string; registrationRequest: string }
): Promise<{ registrationResponse: string }> {
  await requirePasswordProtocol(deps);

  const ticket = deps.resetTickets.peek(input.resetTicket);
  if (!ticket) {
    throw unauthorized(AUTH_MESSAGES.invalidResetTicket);
  }

  try {
    return {
      registrationResponse: deps.password.createRegistrationResponse({
        userIdentifier: ticket.userId,
        registrationRequest: input.registrationRequest
      })
    };
  } catch (error) {
    logger.error("auth/password/reset/register/start: failed", {
      errorName: (error as Error).name
    });
    throw validation(AUTH_MESSAGES.passwordResetStartFailed);
  }
}

export async function finishPasswordResetRegistration(
  deps: AuthModuleDeps,
  input: { resetTicket: string; registrationRecord: string }
): Promise<AuthSession> {
  await requirePasswordProtocol(deps);
  requireTokenIssuer(deps);

  const ticket = deps.resetTickets.take(input.resetTicket);
  if (!ticket) {
    throw unauthorized(AUTH_MESSAGES.invalidResetTicket);
  }

  const user = await deps.users.replacePasswordCredential(
    ticket.userId,
    input.registrationRecord,
    new Date()
  );
  logger.info("auth/password/reset/register/finish: password replaced", { userId: user.id });
  return authSession(deps.tokens, user);
}
