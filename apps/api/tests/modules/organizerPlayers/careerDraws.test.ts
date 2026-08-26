import test from "node:test";
import assert from "node:assert/strict";

import { gameWinRate, matchWinRate, standingsLineFromRecord } from "@padel/shared";

import {
  buildLeaderboard,
  type CareerDelta
} from "../../../src/modules/organizerPlayers/domain/careerStats.js";

function delta(overrides: Partial<CareerDelta> = {}): CareerDelta {
  return {
    organizerPlayerId: "player-1",
    organizerPlayerName: "Ana",
    tournamentId: "t1",
    tournamentName: "Friday",
    gamesWon: 0,
    gamesLost: 0,
    setsWon: 0,
    setsLost: 0,
    matchesWon: 0,
    matchesLost: 0,
    matchesDrawn: 0,
    americanoPointsWon: 0,
    americanoPointsLost: 0,
    ...overrides
  };
}

/**
 * Ticket 02 changes the tournament board only. These lock in that the career board already
 * carried draws, so nothing on that wire needed to move — if a future change drops the field,
 * career win rates silently inflate and this fails first.
 */
test("career totals sum matchesDrawn across events", () => {
  const board = buildLeaderboard("all", [
    delta({ tournamentId: "t1", matchesWon: 2, matchesLost: 1, matchesDrawn: 1 }),
    delta({ tournamentId: "t2", matchesWon: 1, matchesLost: 1, matchesDrawn: 2 })
  ]);
  const row = board.rows[0];
  assert.equal(row.matchesWon, 3);
  assert.equal(row.matchesLost, 2);
  assert.equal(row.matchesDrawn, 3);
});

test("a career row feeds the shared helpers without any field renaming guesswork", () => {
  const board = buildLeaderboard("all", [
    delta({ matchesWon: 3, matchesLost: 2, matchesDrawn: 1, gamesWon: 30, gamesLost: 20 })
  ]);
  const row = board.rows[0];
  const line = standingsLineFromRecord({
    wins: row.matchesWon,
    losses: row.matchesLost,
    draws: row.matchesDrawn,
    gamesWon: row.gamesWon,
    gamesLost: row.gamesLost
  });
  assert.equal(line.matchesPlayed, 6, "the draw belongs in the denominator");
  assert.equal(matchWinRate(line), 0.5);
  assert.equal(gameWinRate(line), 0.6);
});

test("an Americano-only career shows a match rate but no game rate", () => {
  const board = buildLeaderboard("all", [
    delta({ matchesWon: 4, matchesLost: 1, matchesDrawn: 1, americanoPointsWon: 120 })
  ]);
  const row = board.rows[0];
  const line = standingsLineFromRecord({
    wins: row.matchesWon,
    losses: row.matchesLost,
    draws: row.matchesDrawn,
    gamesWon: row.gamesWon,
    gamesLost: row.gamesLost
  });
  assert.equal(line.matchesPlayed, 6);
  assert.equal(matchWinRate(line), 4 / 6);
  assert.equal(gameWinRate(line), null, "Americano records no games");
});
