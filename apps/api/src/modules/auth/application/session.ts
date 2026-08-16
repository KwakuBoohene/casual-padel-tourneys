import { logger } from "../../../lib/logger.js";
import { notFound, validation } from "../../../shared/kernel/appError.js";
import { AUTH_MESSAGES, MAGIC_LINK_TTL_MS } from "../domain/authPolicy.js";
import { toAuthUserView, type AuthUserView } from "../domain/authUser.js";
import type { AuthModuleDeps } from "./ports.js";

export async function readAuthMe(
  deps: AuthModuleDeps,
  input: { userId: string }
): Promise<{ user: AuthUserView }> {
  const user = await deps.users.findById(input.userId);
  if (!user) {
    logger.warn("auth/me: user not found", { userId: input.userId });
    throw notFound("User not found.");
  }
  return { user: toAuthUserView(user) };
}

/**
 * Resends the verification link. Delivery failures are swallowed so the caller
 * always sees the same generic message and cannot probe account state.
 */
export async function resendVerification(
  deps: AuthModuleDeps,
  input: { userId: string; isGuest: boolean }
): Promise<void> {
  if (input.isGuest) {
    throw validation(AUTH_MESSAGES.verifyUnavailable);
  }
  const user = await deps.users.findById(input.userId);
  if (!user || user.isGuest) {
    throw validation(AUTH_MESSAGES.verifyUnavailable);
  }
  if (user.emailVerifiedAt) {
    return;
  }

  try {
    const rawToken = await deps.magicTokens.issue({
      userId: user.id,
      purpose: "VERIFY",
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS)
    });
    await deps.notifier.send("VERIFY", user.email, rawToken);
    logger.info("auth/verify/resend: sent", { userId: user.id });
  } catch (error) {
    logger.error("auth/verify/resend: failed", { errorName: (error as Error).name });
  }
}
