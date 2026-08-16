import { logger } from "../../../lib/logger.js";
import { conflict, validation } from "../../../shared/kernel/appError.js";
import { AUTH_MESSAGES, VERIFY_DUE_MS } from "../domain/authPolicy.js";
import { normalizeEmail } from "../domain/email.js";
import { authSession, requireGuestAccount, type AuthSession } from "./authSession.js";
import type { AuthModuleDeps } from "./ports.js";
import { requirePasswordProtocol } from "./passwordSupport.js";

type GuestRequest = { userId: string; isGuest: boolean };

const ONLY_GUEST_PASSWORD = "Only guest accounts can attach a password.";

export async function startAttachPassword(
  deps: AuthModuleDeps,
  input: GuestRequest & { email: string; registrationRequest: string }
): Promise<{ registrationResponse: string }> {
  const guest = await requireGuestAccount(deps, input, ONLY_GUEST_PASSWORD);
  await requirePasswordProtocol(deps);

  const email = normalizeEmail(input.email);
  const existing = await deps.users.findByEmail(email);
  if (existing && existing.id !== guest.id) {
    throw conflict(AUTH_MESSAGES.accountInUse);
  }

  // Stays a guest until the finish step proves the client holds the password.
  const user = await deps.users.update(guest.id, {
    email,
    emailVerificationDueAt: new Date(Date.now() + VERIFY_DUE_MS),
    isGuest: true
  });
  if (await deps.users.hasPasswordCredential(user.id)) {
    throw conflict(AUTH_MESSAGES.passwordAlreadySet);
  }

  try {
    return {
      registrationResponse: deps.password.createRegistrationResponse({
        userIdentifier: user.id,
        registrationRequest: input.registrationRequest
      })
    };
  } catch (error) {
    logger.error("auth/attach/password/register/start: failed", {
      errorName: (error as Error).name
    });
    throw validation(AUTH_MESSAGES.passwordRegisterStartFailed);
  }
}

export async function finishAttachPassword(
  deps: AuthModuleDeps,
  input: GuestRequest & { email: string; registrationRecord: string }
): Promise<AuthSession> {
  const guest = await requireGuestAccount(deps, input, ONLY_GUEST_PASSWORD);
  await requirePasswordProtocol(deps);

  const user = await deps.users.findById(guest.id);
  if (!user || normalizeEmail(user.email) !== normalizeEmail(input.email)) {
    throw validation(AUTH_MESSAGES.passwordRegisterFailed);
  }
  if (await deps.users.hasPasswordCredential(user.id)) {
    throw conflict(AUTH_MESSAGES.passwordAlreadySet);
  }

  await deps.users.addPasswordCredential(user.id, input.registrationRecord);
  const updated = await deps.users.update(user.id, {
    isGuest: false,
    emailVerificationDueAt:
      user.emailVerificationDueAt ?? new Date(Date.now() + VERIFY_DUE_MS)
  });

  logger.info("auth/attach/password/register/finish: attached", { userId: updated.id });
  return authSession(deps.tokens, updated);
}
