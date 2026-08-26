import test from "node:test";
import assert from "node:assert/strict";
import { standingsCells, standingsLineFromRecord } from "@padel/shared";

import {
  buildLeaderboardRows,
  compareLeaderboardRows
} from "../../../src/utilities/organizer/leaderboardRows";
import type { LeaderboardRow, LiveTournamentState } from "../../../src/types/organizer/tournament";

function baseTournament(
  overrides: Partial<LiveTournamentState> & {
    config?: Partial<LiveTournamentState["config"]>;
  } = {}
): LiveTournamentState {
  return {
    id: "t1",
    publicToken: "tok",
    version: 1,
    updatedAt: new Date().toISOString(),
    config: {
      name: "Test",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      courts: 1,
      pointsPerMatch: 24,
      ...overrides.config
    },
    players: overrides.players ?? [],
    pendingPlayers: [],
    leaderboard: overrides.leaderboard ?? [],
    rounds: overrides.rounds ?? []
  };
}

test("compareLeaderboardRows ranks Regular by matches then sets then games", () => {
  const a: LeaderboardRow = {
    playerId: "a",
    name: "A",
    wins: 2,
    losses: 0,
    draws: 0,
    gamesPlayed: 2,
    totalPoints: 0,
    setsWon: 2,
    gamesWon: 10,
    isRegular: true
  };
  const b: LeaderboardRow = {
    playerId: "b",
    name: "B",
    wins: 2,
    losses: 0,
    draws: 0,
    gamesPlayed: 2,
    totalPoints: 0,
    setsWon: 3,
    gamesWon: 8,
    isRegular: true
  };
  const c: LeaderboardRow = {
    playerId: "c",
    name: "C",
    wins: 1,
    losses: 1,
    draws: 0,
    gamesPlayed: 2,
    totalPoints: 0,
    setsWon: 5,
    gamesWon: 20,
    isRegular: true
  };
  assert.ok(compareLeaderboardRows(b, a) < 0);
  assert.ok(compareLeaderboardRows(a, c) < 0);
});

test("compareLeaderboardRows ranks Americano by match wins then rally points", () => {
  const fewerWins: LeaderboardRow = {
    playerId: "a",
    name: "A",
    wins: 1,
    losses: 0,
    draws: 0,
    gamesPlayed: 1,
    totalPoints: 40,
    americanoPointsWon: 40
  };
  const moreWins: LeaderboardRow = {
    playerId: "b",
    name: "B",
    wins: 2,
    losses: 0,
    draws: 0,
    gamesPlayed: 2,
    totalPoints: 10,
    americanoPointsWon: 10
  };
  assert.ok(compareLeaderboardRows(moreWins, fewerWins) < 0);
});

test("buildLeaderboardRows uses stored Regular standings without points W–L", () => {
  const tournament = baseTournament({
    config: {
      scoringMode: "REGULAR",
      regularScoring: {
        setFormat: "FULL_SET",
        gameWinBy: 2,
        setsToWin: 1
      }
    },
    players: [
      { id: "p1", name: "Ada", matchesWon: 1, matchesLost: 0, setsWon: 1, gamesWon: 6, gamesLost: 4 },
      { id: "p2", name: "Bea", matchesWon: 0, matchesLost: 1, setsWon: 0, gamesWon: 4, gamesLost: 6 }
    ],
    leaderboard: [
      {
        playerId: "p1",
        name: "Ada",
        totalPoints: 0,
        gamesPlayed: 1,
        rank: 1,
        matchesWon: 1,
        matchesLost: 0,
        setsWon: 1,
        gamesWon: 6,
        gamesLost: 4
      },
      {
        playerId: "p2",
        name: "Bea",
        totalPoints: 0,
        gamesPlayed: 1,
        rank: 2,
        matchesWon: 0,
        matchesLost: 1,
        setsWon: 0,
        gamesWon: 4,
        gamesLost: 6
      }
    ],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        isLocked: false,
        matches: [
          {
            id: "m1",
            court: 1,
            teamA: ["p1", "p1b"],
            teamB: ["p2", "p2b"],
            scoreA: 24,
            scoreB: 10,
            completed: true,
            sets: [{ setNumber: 1, gamesA: 6, gamesB: 4 }]
          }
        ]
      }
    ]
  });

  const rows = buildLeaderboardRows(tournament);
  assert.equal(rows[0]?.playerId, "p1");
  assert.equal(rows[0]?.wins, 1);
  assert.equal(rows[0]?.setsWon, 1);
  assert.equal(rows[0]?.gamesWon, 6);
  assert.equal(rows[0]?.gamesLost, 4);
  assert.equal(rows[0]?.isRegular, true);
  assert.equal(rows[1]?.wins, 0);
});

test("buildLeaderboardRows sorts Americano by wins then rally points", () => {
  const tournament = baseTournament({
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bea" }
    ],
    leaderboard: [
      { playerId: "p1", name: "Ada", totalPoints: 10, gamesPlayed: 1, rank: 2 },
      { playerId: "p2", name: "Bea", totalPoints: 24, gamesPlayed: 1, rank: 1 }
    ],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        isLocked: false,
        matches: [
          {
            id: "m1",
            court: 1,
            teamA: ["p2", "x"],
            teamB: ["p1", "y"],
            scoreA: 24,
            scoreB: 10,
            completed: true
          }
        ]
      }
    ]
  });

  const rows = buildLeaderboardRows(tournament);
  assert.equal(rows[0]?.playerId, "p2");
  assert.equal(rows[0]?.wins, 1);
  // Americano records no games; the win shows up in W and in the rally points, never in GW.
  assert.equal(rows[0]?.gamesWon, 0);
  assert.equal(rows[0]?.americanoPointsWon, 24);
  assert.equal(rows[0]?.americanoPointsLost, 10);
  assert.equal(rows[1]?.wins, 0);
  assert.equal(rows[1]?.gamesLost, 0);
  assert.equal(rows[1]?.americanoPointsWon, 10);
});

test("buildLeaderboardRows counts an Americano tie as a draw", () => {
  const tournament = baseTournament({
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bea" }
    ],
    leaderboard: [
      { playerId: "p1", name: "Ada", totalPoints: 12, gamesPlayed: 1, rank: 1 },
      { playerId: "p2", name: "Bea", totalPoints: 12, gamesPlayed: 1, rank: 2 }
    ],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        isLocked: false,
        matches: [
          {
            id: "m1",
            court: 1,
            teamA: ["p1", "x"],
            teamB: ["p2", "y"],
            scoreA: 12,
            scoreB: 12,
            completed: true
          }
        ]
      }
    ]
  });

  const rows = buildLeaderboardRows(tournament);
  assert.equal(rows[0]?.draws, 1);
  assert.equal(rows[0]?.wins, 0);
  assert.equal(rows[0]?.losses, 0);
  assert.equal(rows[1]?.draws, 1);
});

// --- Americano records no games (epic 27, DECISIONS 17-19) --------------------------------------

/** One completed Americano match: p1/x beat p2/y 24-10. */
function americanoWithOneMatch(): LiveTournamentState {
  return baseTournament({
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bea" }
    ],
    leaderboard: [
      { playerId: "p1", name: "Ada", totalPoints: 24, gamesPlayed: 1, rank: 1 },
      { playerId: "p2", name: "Bea", totalPoints: 10, gamesPlayed: 1, rank: 2 }
    ],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        isLocked: false,
        matches: [
          {
            id: "m1",
            court: 1,
            teamA: ["p1", "x"],
            teamB: ["p2", "y"],
            scoreA: 24,
            scoreB: 10,
            completed: true
          }
        ]
      }
    ]
  });
}

test("an Americano match never credits a game, so GW/GL/GD stay zero", () => {
  const rows = buildLeaderboardRows(americanoWithOneMatch());
  for (const row of rows) {
    assert.equal(row.gamesWon ?? 0, 0, `${row.name} should have no games won`);
    assert.equal(row.gamesLost ?? 0, 0, `${row.name} should have no games lost`);
  }
});

test("game win rate is unavailable for Americano rather than a fabricated 100%", () => {
  const rows = buildLeaderboardRows(americanoWithOneMatch());
  const winner = rows.find((row) => row.playerId === "p1")!;
  const line = standingsLineFromRecord({
    wins: winner.wins,
    losses: winner.losses,
    draws: winner.draws,
    gamesWon: winner.gamesWon ?? 0,
    gamesLost: winner.gamesLost ?? 0
  });
  assert.equal(standingsCells(line).gwr, "—", "no games played means no game win rate");
});

test("a voided Americano match is not credited at all", () => {
  const tournament = americanoWithOneMatch();
  tournament.rounds[0].matches[0].voidedAt = new Date().toISOString();
  const rows = buildLeaderboardRows(tournament);
  for (const row of rows) {
    assert.equal(row.wins, 0, `${row.name} played nothing that counts`);
    assert.equal(row.losses, 0);
    assert.equal(row.americanoPointsWon ?? 0, 0);
  }
});

test("Regular play still reports real games — the fix is Americano-only", () => {
  const tournament = baseTournament({
    config: { scoringMode: "REGULAR" },
    players: [{ id: "p1", name: "Ada", matchesWon: 1, matchesLost: 0, setsWon: 1, gamesWon: 6, gamesLost: 4 }],
    leaderboard: [
      {
        playerId: "p1",
        name: "Ada",
        totalPoints: 0,
        gamesPlayed: 1,
        rank: 1,
        matchesWon: 1,
        matchesLost: 0,
        setsWon: 1,
        gamesWon: 6,
        gamesLost: 4
      }
    ]
  });
  const row = buildLeaderboardRows(tournament)[0];
  assert.equal(row.gamesWon, 6);
  assert.equal(row.gamesLost, 4);
});
