import assert from "node:assert/strict";
import test from "node:test";

import {
  KING_OF_THE_COURT,
  LEGACY_KING_OF_THE_HILL,
  createKohTournamentSchema,
  isKingOfTheCourtMode,
  normalizeTournamentMode,
  tournamentModeSchema
} from "../src/index.ts";

test("normalizeTournamentMode maps legacy Hill to Court", () => {
  assert.equal(normalizeTournamentMode(LEGACY_KING_OF_THE_HILL), KING_OF_THE_COURT);
  assert.equal(normalizeTournamentMode(KING_OF_THE_COURT), KING_OF_THE_COURT);
  assert.equal(normalizeTournamentMode("AMERICANO"), "AMERICANO");
});

test("isKingOfTheCourtMode accepts Court and legacy Hill", () => {
  assert.equal(isKingOfTheCourtMode(KING_OF_THE_COURT), true);
  assert.equal(isKingOfTheCourtMode(LEGACY_KING_OF_THE_HILL), true);
  assert.equal(isKingOfTheCourtMode("AMERICANO"), false);
});

test("tournamentModeSchema normalizes legacy Hill", () => {
  assert.equal(tournamentModeSchema.parse(LEGACY_KING_OF_THE_HILL), KING_OF_THE_COURT);
  assert.equal(tournamentModeSchema.parse(KING_OF_THE_COURT), KING_OF_THE_COURT);
});

test("createKohTournamentSchema accepts legacy mode and emits Court", () => {
  const parsed = createKohTournamentSchema.parse({
    name: "Friday Court",
    mode: LEGACY_KING_OF_THE_HILL,
    courts: 1,
    regularScoring: { setFormat: "FULL_SET", gameWinBy: 1, setsToWin: 1 }
  });
  assert.equal(parsed.mode, KING_OF_THE_COURT);
});

test("createKohTournamentSchema accepts Court mode", () => {
  const parsed = createKohTournamentSchema.parse({
    name: "Friday Court",
    mode: KING_OF_THE_COURT,
    courts: 1,
    regularScoring: { setFormat: "FULL_SET", gameWinBy: 1, setsToWin: 1 }
  });
  assert.equal(parsed.mode, KING_OF_THE_COURT);
});
