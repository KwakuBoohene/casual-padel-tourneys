import assert from "node:assert/strict";
import test from "node:test";

import type { RegularScoringConfig, RegularSetFormat } from "../../src/types/domain.ts";
import { evaluateSet } from "../../src/scoring/regularScoring.ts";
import {
  DEFAULT_SET_TIEBREAK_TO,
  defaultGameWinByForSetFormat,
  needsSetTiebreak
} from "../../src/scoring/setMargin.ts";

/** The config an organizer gets when they pick a format and change nothing else. */
function defaultsFor(setFormat: RegularSetFormat): RegularScoringConfig {
  const gameWinBy = defaultGameWinByForSetFormat(setFormat);
  return {
    setFormat,
    gameWinBy,
    setsToWin: 1,
    setTiebreakTo: needsSetTiebreak(setFormat, gameWinBy) ? DEFAULT_SET_TIEBREAK_TO : undefined
  };
}

test("short set formats default to a one-game margin, full sets to two", () => {
  assert.equal(defaultGameWinByForSetFormat("BO3_GAMES"), 1);
  assert.equal(defaultGameWinByForSetFormat("BO5_GAMES"), 1);
  assert.equal(defaultGameWinByForSetFormat("FULL_SET"), 2);
});

test("only a full set won by two needs a tiebreak target", () => {
  assert.equal(needsSetTiebreak("FULL_SET", 2), true);
  assert.equal(needsSetTiebreak("FULL_SET", 1), false);
  assert.equal(needsSetTiebreak("BO3_GAMES", 2), false);
  assert.equal(needsSetTiebreak("BO5_GAMES", 1), false);
});

test("best of 3 games saves a 2–1 set by default", () => {
  const config = defaultsFor("BO3_GAMES");
  const result = evaluateSet({ gamesA: 2, gamesB: 1 }, config);
  assert.equal(result.complete, true);
  assert.equal(result.winner, "A");
});

test("best of 5 games saves a 3–2 set by default", () => {
  const config = defaultsFor("BO5_GAMES");
  const result = evaluateSet({ gamesA: 2, gamesB: 3 }, config);
  assert.equal(result.complete, true);
  assert.equal(result.winner, "B");
});

test("short sets stay open until someone reaches the target", () => {
  assert.equal(evaluateSet({ gamesA: 1, gamesB: 1 }, defaultsFor("BO3_GAMES")).complete, false);
  assert.equal(evaluateSet({ gamesA: 2, gamesB: 2 }, defaultsFor("BO5_GAMES")).complete, false);
});

test("full set defaults accept the classic two-game wins", () => {
  const config = defaultsFor("FULL_SET");
  for (const [gamesA, gamesB] of [
    [6, 0],
    [6, 3],
    [6, 4],
    [7, 5]
  ]) {
    const result = evaluateSet({ gamesA, gamesB }, config);
    assert.equal(result.complete, true, `${gamesA}–${gamesB} should be a completed set`);
    assert.equal(result.winner, "A");
  }
});

test("full set at 6–5 stays open and 6–6 goes to a tiebreak", () => {
  const config = defaultsFor("FULL_SET");
  assert.equal(evaluateSet({ gamesA: 6, gamesB: 5 }, config).complete, false);

  const noTb = evaluateSet({ gamesA: 6, gamesB: 6 }, config);
  assert.equal(noTb.complete, false);
  assert.match(noTb.error ?? "", /tiebreak/i);

  const withTb = evaluateSet({ gamesA: 6, gamesB: 6, tbA: 7, tbB: 4 }, config);
  assert.equal(withTb.complete, true);
  assert.equal(withTb.winner, "A");
});

test("a full set reaching 7 games can only be 7–5", () => {
  const config = defaultsFor("FULL_SET");
  for (const gamesB of [0, 1, 2, 3, 4, 6]) {
    const result = evaluateSet({ gamesA: 7, gamesB }, config);
    assert.equal(result.complete, false, `7–${gamesB} should not be a valid set`);
    assert.match(result.error ?? "", /invalid full-set score/i);
  }
  assert.equal(evaluateSet({ gamesA: 7, gamesB: 5 }, config).complete, true);
});
