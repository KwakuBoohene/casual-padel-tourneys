import { logger } from "../../../lib/logger.js";
import { unauthorized } from "../../../shared/kernel/appError.js";
import { AUTH_MESSAGES, MAGIC_LINK_TTL_MS, VERIFY_DUE_MS } from "../domain/authPolicy.js";
import { nameFromEmail, normalizeEmail } from "../domain/email.js";
import { authSession, requireTokenIssuer, type AuthSession } from "./authSession.js";
import type { AuthModuleDeps } from "./ports.js";

/**
 * Issues a sign-in link, creating the account on first use. Failures are logged and
 * swallowed so the endpoint cannot be used to enumerate emails or probe mail config.
 */
export async function requestMagicLink(
  deps: AuthModuleDeps,
  input: { email: string }
): Promise<void> {
  const email = normalizeEmail(input.email);
  try {
    const now = new Date();
    const existing = await deps.users.findByEmail(email);
    const user =
      existing ??
      (await deps.users.create({
        email,
        name: nameFromEmail(email),
        isGuest: false,
        emailVerificationDueAt: new Date(now.getTime() + VERIFY_DUE_MS)
      }));
    if (!existing) {
      logger.info("auth/magic-link: created user for magic link", { userId: user.id });
    }

    const rawToken = await deps.magicTokens.issue({
      userId: user.id,
      purpose: "LOGIN",
      expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS)
    });
    await deps.notifier.send("SIGN_IN", email, rawToken);
  } catch (error) {
    logger.error("auth/magic-link: failed to issue link", {
      errorId: (error as Error).name
    });
  }
}

export async function consumeMagicLink(
  deps: AuthModuleDeps,
  input: { token: string }
): Promise<AuthSession> {
  requireTokenIssuer(deps);
  const user = await deps.magicTokens.consumeSignIn(input.token);
  if (!user) {
    throw unauthorized(AUTH_MESSAGES.invalidMagicLink);
  }
  logger.info("auth/magic-link/consume: signed in", { userId: user.id });
  return authSession(deps.tokens, user);
}
