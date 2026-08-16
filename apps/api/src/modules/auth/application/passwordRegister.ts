import { logger } from "../../../lib/logger.js";
import { conflict, validation } from "../../../shared/kernel/appError.js";
import { AUTH_MESSAGES, VERIFY_DUE_MS } from "../domain/authPolicy.js";
import { nameFromEmail, normalizeEmail } from "../domain/email.js";
import type { AuthModuleDeps } from "./ports.js";
import { requirePasswordProtocol } from "./passwordSupport.js";

export async function startPasswordRegistration(
  deps: AuthModuleDeps,
  input: { email: string; registrationRequest: string }
): Promise<{ registrationResponse: string }> {
  await requirePasswordProtocol(deps);

  const email = normalizeEmail(input.email);
  const existing = await deps.users.findByEmail(email);
  if (existing && (await deps.users.hasPasswordCredential(existing.id))) {
    throw conflict(AUTH_MESSAGES.passwordAlreadySet);
  }

  const user =
    existing ??
    (await deps.users.create({
      email,
      name: nameFromEmail(email),
      isGuest: false,
      emailVerificationDueAt: new Date(Date.now() + VERIFY_DUE_MS)
    }));
  if (!existing) {
    logger.info("auth/password/register/start: created user", { userId: user.id });
  }

  try {
    return {
      registrationResponse: deps.password.createRegistrationResponse({
        userIdentifier: user.id,
        registrationRequest: input.registrationRequest
      })
    };
  } catch (error) {
    logger.error("auth/password/register/start: failed", {
      errorName: (error as Error).name
    });
    throw validation(AUTH_MESSAGES.passwordRegisterStartFailed);
  }
}

export async function finishPasswordRegistration(
  deps: AuthModuleDeps,
  input: { email: string; registrationRecord: string }
): Promise<void> {
  await requirePasswordProtocol(deps);

  const user = await deps.users.findByEmail(normalizeEmail(input.email));
  if (!user) {
    throw validation(AUTH_MESSAGES.passwordRegisterFailed);
  }
  if (await deps.users.hasPasswordCredential(user.id)) {
    throw conflict(AUTH_MESSAGES.passwordAlreadySet);
  }

  await deps.users.addPasswordCredential(user.id, input.registrationRecord);
  if (!user.emailVerificationDueAt) {
    await deps.users.update(user.id, {
      emailVerificationDueAt: new Date(Date.now() + VERIFY_DUE_MS)
    });
  }
  logger.info("auth/password/register/finish: password credential stored", {
    userId: user.id
  });
}
