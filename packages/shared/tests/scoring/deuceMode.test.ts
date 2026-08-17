import assert from "node:assert/strict";
import test from "node:test";

import {
  allowsSpecialWinMethods,
  deuceModeLabel,
  gameWinByForDeuceMode,
  hasWinMethodPayload,
  resolveDeuceMode,
  specialPointLabelForSet
} from "../../src/scoring/deuceMode.ts";

test("gameWinByForDeuceMode maps Advantage to 2 and Golden/Star to 1", () => {
  assert.equal(gameWinByForDeuceMode("ADVANTAGE"), 2);
  assert.equal(gameWinByForDeuceMode("GOLDEN"), 1);
  assert.equal(gameWinByForDeuceMode("STAR"), 1);
});

test("resolveDeuceMode infers Advantage vs Golden when omitted", () => {
  assert.equal(resolveDeuceMode({ gameWinBy: 2 }), "ADVANTAGE");
  assert.equal(resolveDeuceMode({ gameWinBy: 1 }), "GOLDEN");
  assert.equal(resolveDeuceMode({ gameWinBy: 1, deuceMode: "STAR" }), "STAR");
});

test("deuceModeLabel uses padel copy", () => {
  assert.equal(deuceModeLabel("ADVANTAGE"), "Advantage");
  assert.equal(deuceModeLabel("GOLDEN"), "Golden point");
  assert.equal(deuceModeLabel("STAR"), "Star point");
});

test("allowsSpecialWinMethods is only Golden and Star", () => {
  assert.equal(allowsSpecialWinMethods("ADVANTAGE"), false);
  assert.equal(allowsSpecialWinMethods("GOLDEN"), true);
  assert.equal(allowsSpecialWinMethods("STAR"), true);
});

test("hasWinMethodPayload treats empty arrays as absent", () => {
  assert.equal(hasWinMethodPayload([{ winMethodsA: [], winMethodsB: [] }]), false);
  assert.equal(hasWinMethodPayload([{ winMethodsA: ["GOLDEN"] }]), true);
});

test("specialPointLabelForSet prefers Star over Golden", () => {
  assert.equal(specialPointLabelForSet({ setNumber: 1, gamesA: 6, gamesB: 4 }), null);
  assert.equal(
    specialPointLabelForSet({
      setNumber: 1,
      gamesA: 6,
      gamesB: 4,
      winMethodsA: ["REGULAR", "GOLDEN"],
      winMethodsB: []
    }),
    "Golden"
  );
  assert.equal(
    specialPointLabelForSet({
      setNumber: 1,
      gamesA: 6,
      gamesB: 4,
      winMethodsA: ["GOLDEN"],
      winMethodsB: ["STAR"]
    }),
    "Star"
  );
});
