import { randomBytes } from "node:crypto";

/**
 * Share tokens are capabilities: anyone holding one gets the data. They must therefore be
 * unguessable, which rules out `Math.random` — it is not a cryptographic source and its output
 * is predictable from prior samples.
 *
 * 24 bytes of base64url ≈ 192 bits of entropy.
 */
export function createShareToken(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}
