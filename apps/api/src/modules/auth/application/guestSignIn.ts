import { logger } from "../../../lib/logger.js";
import { AppError, validation } from "../../../shared/kernel/appError.js";
import { guestEmail, isValidGuestId, randomGuestName } from "../domain/authPolicy.js";
import { authSession, type AuthSession } from "./authSession.js";
import type { AuthModuleDeps } from "./ports.js";

export async function guestSignIn(
  deps: AuthModuleDeps,
  input: { guestId?: unknown }
): Promise<AuthSession> {
  if (!deps.tokens.isConfigured()) {
    logger.error("auth/guest: JWT_SECRET missing");
    throw new AppError("INTERNAL", 500, "JWT_SECRET is not configured.");
  }

  const guestId = input.guestId;
  if (typeof guestId !== "string" || guestId.trim().length === 0) {
    logger.warn("auth/guest: missing guestId");
    throw validation("Missing guestId.");
  }
  if (!isValidGuestId(guestId)) {
    logger.warn("auth/guest: invalid guestId format");
    throw validation("Invalid guestId format.");
  }

  const existing = await deps.users.findByGuestId(guestId);
  if (existing) {
    logger.info("auth/guest: returning guest authenticated", { userId: existing.id });
    return authSession(deps.tokens, existing);
  }

  const created = await deps.users.create({
    guestId,
    email: guestEmail(guestId),
    name: randomGuestName(),
    isGuest: true
  });
  logger.info("auth/guest: new guest created", { userId: created.id });
  return authSession(deps.tokens, created);
}
