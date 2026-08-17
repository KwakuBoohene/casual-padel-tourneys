import assert from "node:assert/strict";
import test from "node:test";

import type { RegularScoringConfig } from "@padel/shared";

import {
  beginNextRegularSet,
  canStartNextSet,
  regularPrimaryAction,
  regularScorePrimaryLabel
} from "../../../src/utilities/organizer/regularSetFlow.ts";
import { regularDisplayScores } from "../../../src/utilities/organizer/regularScoreEntry.ts";

const twoSets: RegularScoringConfig = {
  setFormat: "BO3_GAMES",
  gameWinBy: 1,
  deuceMode: "GOLDEN",
  setsToWin: 2
};

test("beginNextRegularSet starts the next set at 0–0 after an explicit advance", () => {
  const first = { setNumber: 1, gamesA: 2, gamesB: 0 };
  assert.equal(canStartNextSet([first], twoSets), true);
  assert.equal(regularPrimaryAction([first], twoSets), "NEXT_SET");
  const next = beginNextRegularSet({ sets: [first] }, twoSets);
  assert.ok(next);
  assert.equal(next.sets.length, 2);
  assert.deepEqual(next.sets[1], { setNumber: 2, gamesA: 0, gamesB: 0 });
  assert.deepEqual(regularDisplayScores(next.sets, twoSets), { scoreA: 0, scoreB: 0 });
});

test("beginNextRegularSet is a no-op until the current set is complete", () => {
  assert.equal(beginNextRegularSet({ sets: [{ setNumber: 1, gamesA: 1, gamesB: 0 }] }, twoSets), null);
  assert.equal(regularPrimaryAction([{ setNumber: 1, gamesA: 1, gamesB: 0 }], twoSets), "DRAFT");
});

test("regularScorePrimaryLabel uses Next set then Complete", () => {
  assert.equal(regularScorePrimaryLabel("DRAFT", true), "Save draft");
  assert.equal(regularScorePrimaryLabel("NEXT_SET", true), "Next set");
  assert.equal(regularScorePrimaryLabel("COMPLETE", true), "Next");
  assert.equal(regularScorePrimaryLabel("COMPLETE", false), "Complete match");
});
