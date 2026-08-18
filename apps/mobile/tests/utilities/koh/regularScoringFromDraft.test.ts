import assert from "node:assert/strict";
import test from "node:test";

import { regularScoringFromDraft } from "../../../src/utilities/koh/regularScoringFromDraft.ts";
import {
  needsWinMethodPrompt,
  padMatchWinMethods,
  setGameWinMethod
} from "../../../src/utilities/organizer/regularWinMethods.ts";

test("regularScoringFromDraft takes the set margin from the format, not the deuce mode", () => {
  const shortGolden = regularScoringFromDraft("BO3_GAMES", "GOLDEN");
  assert.equal(shortGolden.gameWinBy, 1);
  assert.equal(shortGolden.setTiebreakTo, undefined);

  const shortAdvantage = regularScoringFromDraft("BO5_GAMES", "ADVANTAGE");
  assert.equal(shortAdvantage.gameWinBy, 1);

  const fullStar = regularScoringFromDraft("FULL_SET", "STAR");
  assert.equal(fullStar.gameWinBy, 2);
  assert.equal(fullStar.setTiebreakTo, 7);
});

test("regularScoringFromDraft keeps the chosen deuce mode", () => {
  assert.equal(regularScoringFromDraft("BO3_GAMES", "GOLDEN").deuceMode, "GOLDEN");
  assert.equal(regularScoringFromDraft("FULL_SET", "STAR").deuceMode, "STAR");
  assert.equal(regularScoringFromDraft("FULL_SET", "ADVANTAGE").deuceMode, "ADVANTAGE");
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
