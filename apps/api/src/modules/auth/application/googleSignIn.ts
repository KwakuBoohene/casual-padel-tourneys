import { logger } from "../../../lib/logger.js";
import { AppError, conflict, unauthorized, validation } from "../../../shared/kernel/appError.js";
import { AUTH_MESSAGES } from "../domain/authPolicy.js";
import { authSession, type AuthSession } from "./authSession.js";
import type { AuthModuleDeps, AuthUserRecord, GoogleIdentity } from "./ports.js";

async function linkGoogleIdentity(
  deps: AuthModuleDeps,
  identity: GoogleIdentity
): Promise<AuthUserRecord> {
  const patch = {
    email: identity.email,
    name: identity.name,
    avatarUrl: identity.avatarUrl,
    emailVerifiedAt: new Date(),
    isGuest: false
  };

  const byGoogle = await deps.users.findByGoogleId(identity.googleId);
  if (byGoogle) {
    return deps.users.update(byGoogle.id, patch);
  }

  const byEmail = await deps.users.findByEmail(identity.email);
  if (!byEmail) {
    return deps.users.create({ googleId: identity.googleId, ...patch });
  }
  if (byEmail.googleId && byEmail.googleId !== identity.googleId) {
    throw conflict(AUTH_MESSAGES.accountInUse);
  }

  const linked = await deps.users.update(byEmail.id, {
    googleId: identity.googleId,
    ...patch
  });
  logger.info("auth/google: linked googleId to existing email user", { userId: linked.id });
  return linked;
}

export async function googleSignIn(
  deps: AuthModuleDeps,
  input: { idToken?: string }
): Promise<AuthSession> {
  if (!deps.google.isConfigured() || !deps.tokens.isConfigured()) {
    logger.error("auth/google: not configured", {
      hasGoogle: deps.google.isConfigured(),
      hasJwtSecret: deps.tokens.isConfigured()
    });
    throw new AppError("INTERNAL", 500, AUTH_MESSAGES.googleNotConfigured);
  }
  if (!input.idToken) {
    logger.warn("auth/google: missing idToken");
    throw validation("Missing idToken.");
  }

  const identity = await deps.google.verify(input.idToken);
  if (!identity) {
    logger.warn("auth/google: invalid Google token payload");
    throw unauthorized(AUTH_MESSAGES.invalidGoogleToken);
  }

  const user = await linkGoogleIdentity(deps, identity);
  logger.info("auth/google: user authenticated", { userId: user.id });
  return authSession(deps.tokens, user);
}
