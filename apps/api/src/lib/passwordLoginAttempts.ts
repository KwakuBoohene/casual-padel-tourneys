import { randomBytes } from "node:crypto";

type LoginAttempt = {
  serverLoginState: string;
  userId: string | null;
  expiresAt: number;
};

const TTL_MS = 10 * 60 * 1000;
const attempts = new Map<string, LoginAttempt>();

function pruneExpired(now = Date.now()): void {
  for (const [id, attempt] of attempts) {
    if (attempt.expiresAt <= now) {
      attempts.delete(id);
    }
  }
}

export function storePasswordLoginAttempt(input: {
  serverLoginState: string;
  userId: string | null;
}): string {
  pruneExpired();
  const id = randomBytes(16).toString("base64url");
  attempts.set(id, {
    serverLoginState: input.serverLoginState,
    userId: input.userId,
    expiresAt: Date.now() + TTL_MS
  });
  return id;
}

export function takePasswordLoginAttempt(
  loginId: string
): { serverLoginState: string; userId: string | null } | null {
  pruneExpired();
  const attempt = attempts.get(loginId);
  if (!attempt) {
    return null;
  }
  attempts.delete(loginId);
  if (attempt.expiresAt <= Date.now()) {
    return null;
  }
  return { serverLoginState: attempt.serverLoginState, userId: attempt.userId };
}

/** Test helper */
export function clearPasswordLoginAttempts(): void {
  attempts.clear();
}
