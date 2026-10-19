import { logger } from "../logger";

/**
 * Endpoints that answer 401 for bad credentials rather than a bad session token. The client still
 * attaches a stale in-memory token to these, so the header alone cannot tell them apart.
 */
const UNAUTHENTICATED_AUTH_PATHS = [
  "/auth/password/login",
  "/auth/password/register",
  "/auth/password/reset",
  "/auth/magic-link",
  "/auth/google",
  "/auth/guest"
];

let handler: (() => void) | null = null;
let expired = false;

/**
 * A 401 on a request that carried a bearer token means the token was rejected. The API issues no
 * refresh token, so there is nothing to recover with and the session is over.
 */
export function isSessionExpiryFailure(path: string, status: number, sentToken: boolean): boolean {
  if (status !== 401 || !sentToken) {
    return false;
  }
  return !UNAUTHENTICATED_AUTH_PATHS.some((prefix) => path.startsWith(prefix));
}

export function setSessionExpiryHandler(next: (() => void) | null): void {
  handler = next;
}

/**
 * Latched synchronously so error surfaces can suppress themselves before React commits the
 * sign-out state — concurrent queries all 401 together, but the user is signed out once.
 */
export function notifyAuthFailure(path: string, status: number, sentToken: boolean): void {
  if (!isSessionExpiryFailure(path, status, sentToken) || expired) {
    return;
  }
  expired = true;
  logger.warn("session expired", { path, status });
  handler?.();
}

export function isSessionExpiryLatched(): boolean {
  return expired;
}

export function clearSessionExpiry(): void {
  expired = false;
}
