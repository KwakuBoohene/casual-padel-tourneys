import assert from "node:assert/strict";
import test from "node:test";

import { importPadelMixSchema, parsePadelMixCode } from "../../src/index.ts";

test("parsePadelMixCode reads the code from live links and bare codes", () => {
  assert.equal(parsePadelMixCode("https://padelmix.app/live/STCSC6026I"), "STCSC6026I");
  assert.equal(parsePadelMixCode("  padelmix.app/live/STCSC6026I/  "), "STCSC6026I");
  assert.equal(parsePadelMixCode("https://www.padelmix.app/es/live/abc123?app=1"), "abc123");
  assert.equal(parsePadelMixCode("STCSC6026I"), "STCSC6026I");
});

test("parsePadelMixCode rejects other hosts, paths and malformed codes", () => {
  assert.equal(parsePadelMixCode("https://evil.example/live/STCSC6026I"), null);
  assert.equal(parsePadelMixCode("https://padelmix.app.evil.example/live/STCSC6026I"), null);
  assert.equal(parsePadelMixCode("https://evil.example/?next=padelmix.app/live/STCSC6026I"), null);
  assert.equal(parsePadelMixCode("https://padelmix.app/leagues/STCSC6026I"), null);
  assert.equal(parsePadelMixCode("https://padelmix.app/live/../admin"), null);
  assert.equal(parsePadelMixCode(""), null);
});

test("importPadelMixSchema accepts a live link and rejects anything else", () => {
  assert.equal(importPadelMixSchema.safeParse({ url: "https://padelmix.app/live/STCSC6026I" }).success, true);
  assert.equal(importPadelMixSchema.safeParse({ url: "https://example.com" }).success, false);
  assert.equal(importPadelMixSchema.safeParse({}).success, false);
});
