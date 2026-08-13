import { createHash, randomBytes } from "node:crypto";

export function hashMagicToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function createMagicToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashMagicToken(rawToken) };
}
