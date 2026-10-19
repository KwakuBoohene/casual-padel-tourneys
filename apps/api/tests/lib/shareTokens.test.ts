import test from "node:test";
import assert from "node:assert/strict";

import { createShareToken } from "../../src/lib/shareTokens.js";

/**
 * base64url includes `_`, which is also the prefix separator, so the body must be taken by
 * offset rather than by splitting — a naive split silently truncates roughly one token in 64.
 */
function body(token: string, prefix: string): string {
  assert.ok(token.startsWith(`${prefix}_`), `missing prefix: ${token}`);
  return token.slice(prefix.length + 1);
}

test("tokens carry their prefix", () => {
  assert.match(createShareToken("career"), /^career_/);
});

test("tokens are long enough to be unguessable", () => {
  for (let i = 0; i < 200; i += 1) {
    const value = body(createShareToken("career"), "career");
    // 24 random bytes in base64url is 32 characters.
    assert.equal(value.length, 32, `unexpected token length: ${value}`);
    assert.match(value, /^[A-Za-z0-9_-]+$/, "url-safe");
  }
});

test("tokens do not repeat", () => {
  const seen = new Set(Array.from({ length: 2000 }, () => createShareToken("career")));
  assert.equal(seen.size, 2000, "collision in 2000 tokens");
});

test("token bodies are not sequential or low-entropy", () => {
  const bodies = Array.from({ length: 200 }, () => body(createShareToken("x"), "x"));
  const firstChars = new Set(bodies.map((value) => value[0]));
  assert.ok(firstChars.size > 8, "first character barely varies — suspicious source");
});
