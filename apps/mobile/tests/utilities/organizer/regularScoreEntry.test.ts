import assert from "node:assert/strict";
import test from "node:test";

import type { RegularScoringConfig } from "@padel/shared";

import {
  applyRegularSideChange,
  canIncrementRegularSide,
  regularContextLine,
  regularDisplayScores
} from "../../../src/utilities/organizer/regularScoreEntry.ts";

const fullWinBy1: RegularScoringConfig = {
  setFormat: "FULL_SET",
  gameWinBy: 1,
  setsToWin: 1
};

test("two game increments produce 1–1 display", () => {
  let snap = applyRegularSideChange({ sets: [{ setNumber: 1, gamesA: 0, gamesB: 0 }] }, fullWinBy1, "A", 1);
  snap = applyRegularSideChange(snap, fullWinBy1, "B", 1);
  const display = regularDisplayScores(snap.sets, fullWinBy1);
  assert.deepEqual(display, { scoreA: 1, scoreB: 1 });
  assert.equal(regularContextLine(snap.sets, fullWinBy1), "Regular scoring · Set 1 · games");
});

test("win-by-1 blocks plus after 6–5", () => {
  const sets = [{ setNumber: 1, gamesA: 6, gamesB: 5 }];
  assert.equal(canIncrementRegularSide(sets, fullWinBy1, "A"), false);
  assert.equal(canIncrementRegularSide(sets, fullWinBy1, "B"), false);
});

test("completing a set does not start the next set automatically", () => {
  const bestOfThree: RegularScoringConfig = {
    setFormat: "BO3_GAMES",
    gameWinBy: 1,
    deuceMode: "GOLDEN",
    setsToWin: 2
  };
  const snap = applyRegularSideChange(
    { sets: [{ setNumber: 1, gamesA: 1, gamesB: 0 }] },
    bestOfThree,
    "A",
    2
  );
  assert.equal(snap.sets.length, 1);
  assert.deepEqual(regularDisplayScores(snap.sets, bestOfThree), { scoreA: 2, scoreB: 0 });
  assert.equal(canIncrementRegularSide(snap.sets, bestOfThree, "A"), false);
});
