import test from "node:test";
import assert from "node:assert/strict";

import { createShareToken } from "../../src/lib/shareTokens.js";

test("tokens carry their prefix", () => {
  assert.match(createShareToken("career"), /^career_/);
});

test("tokens are long enough to be unguessable", () => {
  const value = createShareToken("career").split("_")[1];
  // 24 random bytes in base64url.
  assert.ok(value.length >= 32, `token body too short: ${value.length}`);
  assert.match(value, /^[A-Za-z0-9_-]+$/, "url-safe");
});

test("tokens do not repeat", () => {
  const seen = new Set(Array.from({ length: 2000 }, () => createShareToken("career")));
  assert.equal(seen.size, 2000, "collision in 2000 tokens");
});

test("token bodies are not sequential or low-entropy", () => {
  const bodies = Array.from({ length: 200 }, () => createShareToken("x").split("_")[1]);
  const firstChars = new Set(bodies.map((body) => body[0]));
  assert.ok(firstChars.size > 8, "first character barely varies — suspicious source");
});
