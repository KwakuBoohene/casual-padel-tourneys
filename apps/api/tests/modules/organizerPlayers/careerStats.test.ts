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
  stats: { matchesWon: number; setsWon: number; gamesWon: number }
): CareerDelta {
  return {
    organizerPlayerId: id,
    organizerPlayerName: name,
    tournamentId: "t1",
    tournamentName: "Night",
    matchesWon: stats.matchesWon,
    matchesLost: 0,
    setsWon: stats.setsWon,
    setsLost: 0,
    gamesWon: stats.gamesWon,
    gamesLost: 0
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
  assert.equal(board.rows[0]?.matchesWon, 3);
  assert.equal(board.rows[1]?.setsWon, 3);
  assert.equal(board.rows[2]?.gamesWon, 20);
});

test("compareCareerRows uses name when matches, sets, and games tie", () => {
  const a = { name: "Ada", matchesWon: 1, setsWon: 1, gamesWon: 6 };
  const b = { name: "Bea", matchesWon: 1, setsWon: 1, gamesWon: 6 };
  assert.ok(compareCareerRows(a, b) < 0);
});
