import { AppError, validation } from "../../../shared/kernel/appError.js";
import { AUTH_MESSAGES } from "../domain/authPolicy.js";
import { toAuthUserView, type AuthTokenSource, type AuthUserView } from "../domain/authUser.js";
import type { AuthModuleDeps, AuthTokenIssuer, AuthUserRecord } from "./ports.js";

export type AuthSession = { token: string; user: AuthUserView };

export function authSession(
  tokens: AuthTokenIssuer,
  user: AuthTokenSource & { avatarUrl?: string | null }
): AuthSession {
  return { token: tokens.sign(user), user: toAuthUserView(user) };
}

export function requireTokenIssuer(deps: AuthModuleDeps): void {
  if (!deps.tokens.isConfigured()) {
    throw new AppError("INTERNAL", 500, AUTH_MESSAGES.authNotConfigured);
  }
}

/** Attach flows only apply to a guest that still exists and is still a guest. */
export async function requireGuestAccount(
  deps: AuthModuleDeps,
  input: { userId: string; isGuest: boolean },
  message: string
): Promise<AuthUserRecord> {
  if (!input.isGuest) {
    throw validation(message);
  }
  const user = await deps.users.findById(input.userId);
  if (!user || !user.isGuest) {
    throw validation(message);
  }
  return user;
}
