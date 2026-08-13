import test from "node:test";
import assert from "node:assert/strict";

import { createMagicToken, hashMagicToken } from "./magicTokens.js";

test("createMagicToken hash differs from raw and is stable", () => {
  const { rawToken, tokenHash } = createMagicToken();
  assert.ok(rawToken.length >= 20);
  assert.notEqual(rawToken, tokenHash);
  assert.equal(hashMagicToken(rawToken), tokenHash);
});
