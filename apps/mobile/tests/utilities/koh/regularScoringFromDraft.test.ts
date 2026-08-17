import assert from "node:assert/strict";
import test from "node:test";

import { regularScoringFromDraft } from "../../../src/utilities/koh/regularScoringFromDraft.ts";
import {
  needsWinMethodPrompt,
  padMatchWinMethods,
  setGameWinMethod
} from "../../../src/utilities/organizer/regularWinMethods.ts";

test("regularScoringFromDraft Golden and Star use gameWinBy 1 and keep deuceMode", () => {
  const golden = regularScoringFromDraft("BO3_GAMES", "GOLDEN");
  assert.equal(golden.gameWinBy, 1);
  assert.equal(golden.deuceMode, "GOLDEN");
  const star = regularScoringFromDraft("FULL_SET", "STAR");
  assert.equal(star.gameWinBy, 1);
  assert.equal(star.deuceMode, "STAR");
  const advantage = regularScoringFromDraft("FULL_SET", "ADVANTAGE");
  assert.equal(advantage.gameWinBy, 2);
  assert.equal(advantage.deuceMode, "ADVANTAGE");
});

test("needsWinMethodPrompt is true only for Golden and Star", () => {
  assert.equal(needsWinMethodPrompt({ setFormat: "BO3_GAMES", gameWinBy: 2, setsToWin: 1 }), false);
  assert.equal(
    needsWinMethodPrompt({ setFormat: "BO3_GAMES", gameWinBy: 1, deuceMode: "GOLDEN", setsToWin: 1 }),
    true
  );
});

test("padMatchWinMethods fills Regular methods to games won", () => {
  const padded = padMatchWinMethods([{ setNumber: 1, gamesA: 2, gamesB: 1, winMethodsA: ["GOLDEN"] }]);
  assert.deepEqual(padded[0].winMethodsA, ["GOLDEN", "REGULAR"]);
  assert.deepEqual(padded[0].winMethodsB, ["REGULAR"]);
});

test("setGameWinMethod updates one game", () => {
  const next = setGameWinMethod(
    [{ setNumber: 1, gamesA: 1, gamesB: 0 }],
    0,
    "A",
    0,
    "STAR"
  );
  assert.equal(next[0].winMethodsA?.[0], "STAR");
});
