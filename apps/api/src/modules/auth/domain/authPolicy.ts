/**
 * Timings and client-visible copy shared by the auth use-cases. The strings are part
 * of the HTTP contract — mobile/web match on them, so treat edits as breaking changes.
 */

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
export const VERIFY_DUE_MS = 24 * 60 * 60 * 1000;

const GUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

export function isValidGuestId(guestId: string): boolean {
  return GUEST_ID_PATTERN.test(guestId);
}

export function guestEmail(guestId: string): string {
  return `guest-${guestId}@padel.local`;
}

export function randomGuestName(): string {
  return `Guest ${String(Math.floor(1000 + Math.random() * 9000))}`;
}

export const AUTH_MESSAGES = {
  accountInUse: "That account is already in use.",
  authNotConfigured: "Authentication is not configured.",
  genericLoginFailure: "Invalid email or password.",
  genericMagicLinkRequest:
    "If an account exists for that email, a sign-in link is on the way.",
  genericResetRequest:
    "If an account exists for that email, a password reset link is on the way.",
  googleNotConfigured: "Google auth is not configured on the server.",
  invalidGoogleToken: "Invalid Google token.",
  invalidMagicLink: "Invalid or expired sign-in link.",
  invalidResetLink: "Invalid or expired password reset link.",
  invalidResetTicket: "Invalid or expired reset session.",
  passwordAlreadySet: "Password already set for this account.",
  passwordNotConfigured: "Password authentication is not configured.",
  passwordRegisterFailed: "Could not complete password registration.",
  passwordRegisterStartFailed: "Could not start password registration.",
  passwordLoginStartFailed: "Could not start password login.",
  passwordResetStartFailed: "Could not start password reset.",
  verifyUnavailable: "Verification is not available for this account.",
  verifySent: "If your account needs verification, a link is on the way."
} as const;
