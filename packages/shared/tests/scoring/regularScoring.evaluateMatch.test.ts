import assert from "node:assert/strict";
import test from "node:test";

import type { MatchSet, RegularScoringConfig } from "../../src/types/domain.ts";
import { REGULAR_MATCH_LENGTH_PRESETS } from "../../src/scoring/regularMatchLength.ts";
import { evaluateMatch } from "../../src/scoring/regularScoring.ts";

function fullSet(setsToWin: number, matchTiebreak = false): RegularScoringConfig {
  return {
    setFormat: "FULL_SET",
    gameWinBy: 1,
    setsToWin,
    matchTiebreak
  };
}

function set(setNumber: number, gamesA: number, gamesB: number): MatchSet {
  return { setNumber, gamesA, gamesB };
}

test("evaluateMatch: 1 set preset completes on first set", () => {
  const { setsToWin, matchTiebreak } = REGULAR_MATCH_LENGTH_PRESETS.ONE_SET;
  const result = evaluateMatch([set(1, 6, 4)], fullSet(setsToWin, matchTiebreak));
  assert.equal(result.complete, true);
  assert.equal(result.winner, "A");
});

test("evaluateMatch: best of 3 stays incomplete at 1–1 without error", () => {
  const config = fullSet(
    REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_3.setsToWin,
    REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_3.matchTiebreak
  );
  const result = evaluateMatch([set(1, 6, 4), set(2, 3, 6)], config);
  assert.equal(result.complete, false);
  assert.equal(result.winner, null);
  assert.equal(result.error, undefined);
  assert.equal(result.setsWonA, 1);
  assert.equal(result.setsWonB, 1);
});

test("evaluateMatch: best of 3 completes at 2–1", () => {
  const config = fullSet(
    REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_3.setsToWin,
    REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_3.matchTiebreak
  );
  const result = evaluateMatch([set(1, 6, 4), set(2, 3, 6), set(3, 6, 2)], config);
  assert.equal(result.complete, true);
  assert.equal(result.winner, "A");
  assert.equal(result.setsWonA, 2);
  assert.equal(result.setsWonB, 1);
});

test("evaluateMatch: two sets + match TB requires TB at 1–1", () => {
  const config = fullSet(
    REGULAR_MATCH_LENGTH_PRESETS.TWO_SETS_MATCH_TB.setsToWin,
    REGULAR_MATCH_LENGTH_PRESETS.TWO_SETS_MATCH_TB.matchTiebreak
  );
  const pending = evaluateMatch([set(1, 6, 4), set(2, 2, 6)], config);
  assert.equal(pending.complete, false);
  assert.match(pending.error ?? "", /match tiebreak/i);

  const done = evaluateMatch([set(1, 6, 4), set(2, 2, 6)], config, { a: 10, b: 8 });
  assert.equal(done.complete, true);
  assert.equal(done.winner, "A");
});

test("evaluateMatch: best of 5 incomplete at 2–2", () => {
  const config = fullSet(
    REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_5.setsToWin,
    REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_5.matchTiebreak
  );
  const result = evaluateMatch(
    [set(1, 6, 4), set(2, 4, 6), set(3, 6, 3), set(4, 1, 6)],
    config
  );
  assert.equal(result.complete, false);
  assert.equal(result.error, undefined);
  assert.equal(result.setsWonA, 2);
  assert.equal(result.setsWonB, 2);
});

test("evaluateMatch: best of 7 completes at 4–3", () => {
  const config = fullSet(
    REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_7.setsToWin,
    REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_7.matchTiebreak
  );
  const result = evaluateMatch(
    [
      set(1, 6, 4),
      set(2, 4, 6),
      set(3, 6, 3),
      set(4, 2, 6),
      set(5, 6, 1),
      set(6, 3, 6),
      set(7, 6, 2)
    ],
    config
  );
  assert.equal(result.complete, true);
  assert.equal(result.winner, "A");
  assert.equal(result.setsWonA, 4);
  assert.equal(result.setsWonB, 3);
});
