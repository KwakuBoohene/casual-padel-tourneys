import test from "node:test";
import assert from "node:assert/strict";
import type { TournamentMode } from "@padel/shared";

import {
  buildLeaderboard,
  type CareerDelta
} from "../../../src/modules/organizerPlayers/domain/careerStats.js";

function delta(
  name: string,
  mode: TournamentMode,
  won: { games: number; lost: number; match: boolean },
  tournamentId = `t-${mode}`
): CareerDelta {
  return {
    organizerPlayerId: `orgplayer-${name.toLowerCase()}`,
    organizerPlayerName: name,
    tournamentId,
    tournamentName: `${mode} night`,
    tournamentMode: mode,
    gamesWon: won.games,
    gamesLost: won.lost,
    matchesWon: won.match ? 1 : 0,
    matchesLost: won.match ? 0 : 1
  };
}

const overall = { range: "all", mode: "overall" } as const;

test("an Americano 14-10 win ranks level with a Regular 6-4 win", () => {
  const board = buildLeaderboard(overall, [
    delta("Ama", "AMERICANO", { games: 14, lost: 10, match: true }),
    delta("Koh", "KING_OF_THE_HILL", { games: 6, lost: 4, match: true })
  ]);

  const [first, second] = board.rows;
  assert.equal(first.matchesWon, 1);
  assert.equal(second.matchesWon, 1);
  assert.equal(first.name, "Ama", "ties break on name, not on raw games");
  assert.equal(second.name, "Koh");
  assert.equal(first.gamesWon, 14, "raw points survive as a secondary stat");
  assert.equal(second.gamesWon, 6);
});

test("match wins outrank raw games", () => {
  const board = buildLeaderboard(overall, [
    delta("Pointsy", "AMERICANO", { games: 40, lost: 44, match: false }),
    delta("Winner", "KING_OF_THE_HILL", { games: 6, lost: 4, match: true })
  ]);

  assert.deepEqual(
    board.rows.map((row) => [row.rank, row.name]),
    [
      [1, "Winner"],
      [2, "Pointsy"]
    ]
  );
});

test("leaderboard echoes the requested range and mode", () => {
  const board = buildLeaderboard({ range: "month", mode: "MEXICANO" }, [
    delta("Solo", "MEXICANO", { games: 20, lost: 12, match: true })
  ]);

  assert.equal(board.range, "month");
  assert.equal(board.mode, "MEXICANO");
  assert.equal(board.q, undefined);
});

test("aggregation sums repeat matches and counts distinct events", () => {
  const board = buildLeaderboard(overall, [
    delta("Ada", "AMERICANO", { games: 14, lost: 10, match: true }, "t-1"),
    delta("Ada", "AMERICANO", { games: 12, lost: 12, match: false }, "t-1"),
    delta("Ada", "MEXICANO", { games: 9, lost: 6, match: true }, "t-2")
  ]);

  const [ada] = board.rows;
  assert.equal(ada.matchesWon, 2);
  assert.equal(ada.matchesLost, 1);
  assert.equal(ada.gamesWon, 35);
  assert.equal(ada.gamesLost, 28);
  assert.equal(ada.eventsPlayed, 2);
});

test("q filters names case-insensitively without renumbering ranks", () => {
  const deltas = [
    delta("Alice Ace", "AMERICANO", { games: 14, lost: 10, match: true }),
    delta("Bob Smith", "AMERICANO", { games: 10, lost: 14, match: false })
  ];

  const searched = buildLeaderboard({ ...overall, q: "MIT" }, deltas);
  assert.equal(searched.q, "MIT");
  assert.deepEqual(
    searched.rows.map((row) => [row.rank, row.name]),
    [[2, "Bob Smith"]]
  );

  const blank = buildLeaderboard({ ...overall, q: "   " }, deltas);
  assert.equal(blank.q, undefined);
  assert.equal(blank.rows.length, 2);
});
