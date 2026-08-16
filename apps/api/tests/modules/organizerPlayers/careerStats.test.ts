import assert from "node:assert/strict";
import test from "node:test";

import { buildLeaderboard } from "../../../src/modules/organizerPlayers/domain/careerStats.js";

test("buildLeaderboard ranks by match wins before games won", () => {
  const board = buildLeaderboard("all", [
    {
      organizerPlayerId: "a",
      organizerPlayerName: "Alex",
      tournamentId: "t1",
      tournamentName: "Night A",
      gamesWon: 20,
      gamesLost: 10,
      matchesWon: 1,
      matchesLost: 0
    },
    {
      organizerPlayerId: "b",
      organizerPlayerName: "Blair",
      tournamentId: "t2",
      tournamentName: "Night B",
      gamesWon: 6,
      gamesLost: 4,
      matchesWon: 2,
      matchesLost: 0
    }
  ]);
  assert.equal(board.rows[0].name, "Blair");
  assert.equal(board.rows[1].name, "Alex");
});

test("buildLeaderboard filters rows by case-insensitive search", () => {
  const board = buildLeaderboard(
    "year",
    [
      {
        organizerPlayerId: "a",
        organizerPlayerName: "Jordan Lee",
        tournamentId: "t1",
        tournamentName: "Night",
        gamesWon: 6,
        gamesLost: 4,
        matchesWon: 1,
        matchesLost: 0
      },
      {
        organizerPlayerId: "b",
        organizerPlayerName: "Sam Patel",
        tournamentId: "t1",
        tournamentName: "Night",
        gamesWon: 6,
        gamesLost: 4,
        matchesWon: 1,
        matchesLost: 0
      }
    ],
    { q: "lee" }
  );
  assert.equal(board.rows.length, 1);
  assert.equal(board.rows[0].name, "Jordan Lee");
});
