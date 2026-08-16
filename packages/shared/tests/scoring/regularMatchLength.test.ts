import assert from "node:assert/strict";
import test from "node:test";

import {
  REGULAR_MATCH_LENGTH_PRESETS,
  REGULAR_SETS_TO_WIN_MAX,
  maxSetsForRegularMatch,
  regularMatchLengthFromPreset
} from "../../src/scoring/regularMatchLength.ts";
import { createKohTournamentSchema } from "../../src/schemas/koh.ts";
import { createTournamentSchema, regularScoringSchema } from "../../src/schemas/tournament.ts";

const basePlayers = [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }];

test("presets match locked UI mapping", () => {
  assert.deepEqual(REGULAR_MATCH_LENGTH_PRESETS.ONE_SET, { setsToWin: 1, matchTiebreak: false });
  assert.deepEqual(REGULAR_MATCH_LENGTH_PRESETS.TWO_SETS_MATCH_TB, {
    setsToWin: 2,
    matchTiebreak: true
  });
  assert.deepEqual(REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_3, { setsToWin: 2, matchTiebreak: false });
  assert.deepEqual(REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_5, { setsToWin: 3, matchTiebreak: false });
  assert.deepEqual(REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_7, { setsToWin: 4, matchTiebreak: false });
  assert.equal(REGULAR_SETS_TO_WIN_MAX, 4);
  assert.deepEqual(regularMatchLengthFromPreset("BEST_OF_7"), {
    setsToWin: 4,
    matchTiebreak: false
  });
});

test("maxSetsForRegularMatch covers best-of and match-TB", () => {
  assert.equal(maxSetsForRegularMatch({ setsToWin: 1, matchTiebreak: false }), 1);
  assert.equal(maxSetsForRegularMatch({ setsToWin: 2, matchTiebreak: false }), 3);
  assert.equal(maxSetsForRegularMatch({ setsToWin: 3, matchTiebreak: false }), 5);
  assert.equal(maxSetsForRegularMatch({ setsToWin: 4, matchTiebreak: false }), 7);
  assert.equal(maxSetsForRegularMatch({ setsToWin: 2, matchTiebreak: true }), 2);
});

test("regularScoringSchema accepts every match-length preset", () => {
  for (const fields of Object.values(REGULAR_MATCH_LENGTH_PRESETS)) {
    const parsed = regularScoringSchema.parse({
      setFormat: "FULL_SET",
      gameWinBy: 1,
      ...fields
    });
    assert.equal(parsed.setsToWin, fields.setsToWin);
    assert.equal(parsed.matchTiebreak, fields.matchTiebreak);
  }
});

test("regularScoringSchema rejects setsToWin above max", () => {
  const result = regularScoringSchema.safeParse({
    setFormat: "FULL_SET",
    gameWinBy: 1,
    setsToWin: REGULAR_SETS_TO_WIN_MAX + 1
  });
  assert.equal(result.success, false);
});

test("regularScoringSchema rejects matchTiebreak unless setsToWin is 2", () => {
  const result = regularScoringSchema.safeParse({
    setFormat: "FULL_SET",
    gameWinBy: 1,
    setsToWin: 1,
    matchTiebreak: true
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues.map((i) => i.message).join(" "), /match tiebreak/i);
  }
});

test("createTournamentSchema accepts Regular best of 7", () => {
  const parsed = createTournamentSchema.parse({
    name: "Sunday Mix",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: basePlayers,
    courts: 1,
    targetGamesPerPlayer: 4,
    scoringMode: "REGULAR",
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 1,
      ...REGULAR_MATCH_LENGTH_PRESETS.BEST_OF_7
    }
  });
  assert.equal(parsed.regularScoring?.setsToWin, 4);
});

test("createTournamentSchema rejects Regular with invalid matchTiebreak combo", () => {
  const result = createTournamentSchema.safeParse({
    name: "Sunday Mix",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: basePlayers,
    courts: 1,
    targetGamesPerPlayer: 4,
    scoringMode: "REGULAR",
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 1,
      setsToWin: 3,
      matchTiebreak: true
    }
  });
  assert.equal(result.success, false);
});

test("createKohTournamentSchema rejects matchTiebreak with single set", () => {
  const result = createKohTournamentSchema.safeParse({
    name: "Court Night",
    mode: "KING_OF_THE_HILL",
    courts: 1,
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 1,
      setsToWin: 1,
      matchTiebreak: true
    }
  });
  assert.equal(result.success, false);
});
