import test from "node:test";
import assert from "node:assert/strict";

import type { RegularScoringConfig } from "@padel/shared";

import { evaluateMatch, evaluateSet } from "../../src/engine/regularScoring.js";

const fullSetWinBy1: RegularScoringConfig = {
  setFormat: "FULL_SET",
  gameWinBy: 1,
  setsToWin: 1
};

const fullSetWinBy2: RegularScoringConfig = {
  setFormat: "FULL_SET",
  gameWinBy: 2,
  setsToWin: 1,
  setTiebreakTo: 7
};

test("evaluateSet accepts 6–5 for full set win-by-1", () => {
  const result = evaluateSet({ gamesA: 6, gamesB: 5 }, fullSetWinBy1);
  assert.equal(result.complete, true);
  assert.equal(result.winner, "A");
});

test("evaluateSet rejects 7–5 for full set win-by-1", () => {
  const result = evaluateSet({ gamesA: 7, gamesB: 5 }, fullSetWinBy1);
  assert.equal(result.complete, false);
  assert.match(result.error ?? "", /6–5|never 7/i);
});

test("evaluateSet accepts 7–5 for full set win-by-2", () => {
  const result = evaluateSet({ gamesA: 7, gamesB: 5 }, fullSetWinBy2);
  assert.equal(result.complete, true);
  assert.equal(result.winner, "A");
});

test("evaluateSet treats 6–5 as incomplete for win-by-2", () => {
  const result = evaluateSet({ gamesA: 6, gamesB: 5 }, fullSetWinBy2);
  assert.equal(result.complete, false);
  assert.equal(result.winner, null);
});

test("evaluateSet requires TB at 6–6 for win-by-2", () => {
  const missing = evaluateSet({ gamesA: 6, gamesB: 6 }, fullSetWinBy2);
  assert.equal(missing.complete, false);
  assert.match(missing.error ?? "", /tiebreak/i);

  const withTb = evaluateSet({ gamesA: 6, gamesB: 6, tbA: 7, tbB: 5 }, fullSetWinBy2);
  assert.equal(withTb.complete, true);
  assert.equal(withTb.winner, "A");
});

test("evaluateMatch completes when one side reaches setsToWin", () => {
  const config: RegularScoringConfig = {
    setFormat: "FULL_SET",
    gameWinBy: 1,
    setsToWin: 2
  };
  const result = evaluateMatch(
    [
      { setNumber: 1, gamesA: 6, gamesB: 4 },
      { setNumber: 2, gamesA: 6, gamesB: 3 }
    ],
    config
  );
  assert.equal(result.complete, true);
  assert.equal(result.winner, "A");
  assert.equal(result.setsWonA, 2);
  assert.equal(result.setsWonB, 0);
});

test("evaluateMatch leaves draft mid-set incomplete", () => {
  const result = evaluateMatch([{ setNumber: 1, gamesA: 4, gamesB: 4 }], fullSetWinBy1);
  assert.equal(result.complete, false);
  assert.equal(result.winner, null);
});
