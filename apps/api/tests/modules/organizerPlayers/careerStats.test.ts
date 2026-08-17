import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLeaderboard,
  compareCareerRows,
  type CareerDelta
} from "../../../src/modules/organizerPlayers/domain/careerStats.js";

function delta(
  id: string,
  name: string,
  stats: {
    matchesWon: number;
    setsWon: number;
    gamesWon: number;
    matchesDrawn?: number;
    americanoPointsWon?: number;
    americanoPointsLost?: number;
  }
): CareerDelta {
  return {
    organizerPlayerId: id,
    organizerPlayerName: name,
    tournamentId: "t1",
    tournamentName: "Night",
    matchesWon: stats.matchesWon,
    matchesLost: 0,
    matchesDrawn: stats.matchesDrawn ?? 0,
    setsWon: stats.setsWon,
    setsLost: 0,
    gamesWon: stats.gamesWon,
    gamesLost: 0,
    americanoPointsWon: stats.americanoPointsWon ?? 0,
    americanoPointsLost: stats.americanoPointsLost ?? 0
  };
}

test("career leaderboard ranks matches, then sets, then games", () => {
  const board = buildLeaderboard("all", [
    delta("games", "Gia", { matchesWon: 1, setsWon: 1, gamesWon: 20 }),
    delta("sets", "Sam", { matchesWon: 1, setsWon: 3, gamesWon: 8 }),
    delta("matches", "Mo", { matchesWon: 3, setsWon: 0, gamesWon: 2 })
  ]);
  assert.deepEqual(
    board.rows.map((row) => row.name),
    ["Mo", "Sam", "Gia"]
  );
});

test("regular games rank above Americano points when match wins tie", () => {
  const board = buildLeaderboard("all", [
    delta("reg", "Rae", { matchesWon: 2, setsWon: 0, gamesWon: 5 }),
    delta("am", "Ami", {
      matchesWon: 2,
      setsWon: 0,
      gamesWon: 1,
      americanoPointsWon: 40,
      americanoPointsLost: 10
    })
  ]);
  assert.equal(board.rows[0]?.name, "Rae");
  assert.equal(board.rows[0]?.gamesWon, 5);
  assert.equal(board.rows[1]?.gamesWon, 0);
  assert.equal(board.rows[1]?.americanoPointsWon, 40);
});

test("compareCareerRows uses name when match, set, game, and Americano points tie", () => {
  const a = { name: "Ada", matchesWon: 1, setsWon: 1, gamesWon: 6, americanoPointsWon: 0 };
  const b = { name: "Bea", matchesWon: 1, setsWon: 1, gamesWon: 6, americanoPointsWon: 0 };
  assert.ok(compareCareerRows(a, b) < 0);
});

test("Americano draws count as matches drawn, not wins", () => {
  const board = buildLeaderboard("all", [
    delta("ami", "Ami", {
      matchesWon: 0,
      setsWon: 0,
      gamesWon: 0,
      matchesDrawn: 1,
      americanoPointsWon: 12,
      americanoPointsLost: 12
    })
  ]);
  assert.equal(board.rows[0]?.matchesDrawn, 1);
  assert.equal(board.rows[0]?.matchesWon, 0);
  assert.equal(board.rows[0]?.gamesWon, 0);
});
