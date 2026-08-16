/**
 * Per-route limits for the unauthenticated auth surface, on top of the global 100/min.
 * Sized for a <1000 user deployment: generous enough for a household or club behind one
 * NAT address, tight enough that credential stuffing and mail flooding are not free.
 */

/** Routes that send an email (magic link, password reset request). */
export const AUTH_EMAIL_SEND_RATE_LIMIT = {
  rateLimit: { max: 5, timeWindow: "15 minutes" }
} as const;

/** Routes that accept a password/OPAQUE exchange or a sign-in attempt. */
export const AUTH_CREDENTIAL_RATE_LIMIT = {
  rateLimit: { max: 20, timeWindow: "15 minutes" }
} as const;

/** Routes that redeem a single-use token from a link. */
export const AUTH_TOKEN_CONSUME_RATE_LIMIT = {
  rateLimit: { max: 20, timeWindow: "15 minutes" }
} as const;
