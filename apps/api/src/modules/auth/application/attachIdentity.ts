import { logger } from "../../../lib/logger.js";
import { AppError, conflict, unauthorized } from "../../../shared/kernel/appError.js";
import { AUTH_MESSAGES, MAGIC_LINK_TTL_MS, VERIFY_DUE_MS } from "../domain/authPolicy.js";
import { toAuthUser, type AuthUser } from "../domain/authUser.js";
import { normalizeEmail } from "../domain/email.js";
import { authSession, requireGuestAccount, type AuthSession } from "./authSession.js";
import type { AuthModuleDeps } from "./ports.js";

type GuestRequest = { userId: string; isGuest: boolean };

const ONLY_GUEST_EMAIL = "Only guest accounts can attach an email.";
const ONLY_GUEST_GOOGLE = "Only guest accounts can attach Google.";

/**
 * Claims an email for a guest but keeps `isGuest` until the confirmation link is
 * consumed, so an unverified address can never take over the account.
 */
export async function attachEmail(
  deps: AuthModuleDeps,
  input: GuestRequest & { email: string }
): Promise<{ message: string; user: AuthUser }> {
  const guest = await requireGuestAccount(deps, input, ONLY_GUEST_EMAIL);

  const email = normalizeEmail(input.email);
  const existing = await deps.users.findByEmail(email);
  if (existing && existing.id !== guest.id) {
    throw conflict(AUTH_MESSAGES.accountInUse);
  }

  const now = new Date();
  const user = await deps.users.update(guest.id, {
    email,
    emailVerificationDueAt: new Date(now.getTime() + VERIFY_DUE_MS),
    isGuest: true
  });

  try {
    const rawToken = await deps.magicTokens.issue({
      userId: user.id,
      purpose: "VERIFY",
      expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS)
    });
    await deps.notifier.send("ATTACH", email, rawToken);
    logger.info("auth/attach/email: sent", { userId: user.id });
  } catch (error) {
    logger.error("auth/attach/email: send failed", { errorName: (error as Error).name });
  }

  return {
    message: "Check your email to confirm and keep this account.",
    user: toAuthUser(user)
  };
}

export async function attachGoogle(
  deps: AuthModuleDeps,
  input: GuestRequest & { idToken: string }
): Promise<AuthSession> {
  const guest = await requireGuestAccount(deps, input, ONLY_GUEST_GOOGLE);

  if (!deps.google.isConfigured()) {
    throw new AppError("INTERNAL", 500, AUTH_MESSAGES.googleNotConfigured);
  }

  const identity = await deps.google.verify(input.idToken).catch(() => null);
  if (!identity) {
    throw unauthorized(AUTH_MESSAGES.invalidGoogleToken);
  }

  const byGoogle = await deps.users.findByGoogleId(identity.googleId);
  if (byGoogle && byGoogle.id !== guest.id) {
    throw conflict(AUTH_MESSAGES.accountInUse);
  }
  const byEmail = await deps.users.findByEmail(identity.email);
  if (byEmail && byEmail.id !== guest.id) {
    throw conflict(AUTH_MESSAGES.accountInUse);
  }

  // guestId is retained so tournaments created as a guest stay attached.
  const user = await deps.users.update(guest.id, {
    googleId: identity.googleId,
    email: identity.email,
    name: identity.name,
    avatarUrl: identity.avatarUrl,
    emailVerifiedAt: new Date(),
    isGuest: false
  });
  logger.info("auth/attach/google: attached", { userId: user.id });
  return authSession(deps.tokens, user);
}
