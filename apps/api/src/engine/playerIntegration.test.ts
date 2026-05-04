import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateAverageGames,
  calculateHandicap,
  canIntegratePlayers,
  isCurrentRoundComplete,
  getIntegrationWaveCount
} from "./playerIntegration.js";
import type { Player, Round } from "@padel/shared";
import type { TournamentState } from "../types/state.js";

// ============================================================================
// calculateAverageGames() Tests
// ============================================================================

test("calculateAverageGames returns 0 for empty array", () => {
  const result = calculateAverageGames([]);
  assert.equal(result, 0);
});

test("calculateAverageGames returns correct value for single player", () => {
  const players: Player[] = [{ id: "p1", name: "Alice", gamesPlayed: 5, totalPoints: 100 }];
  const result = calculateAverageGames(players);
  assert.equal(result, 5);
});

test("calculateAverageGames calculates average correctly for multiple players", () => {
  const players: Player[] = [
    { id: "p1", name: "A", gamesPlayed: 0, totalPoints: 0 },
    { id: "p2", name: "B", gamesPlayed: 2, totalPoints: 48 },
    { id: "p3", name: "C", gamesPlayed: 4, totalPoints: 96 },
    { id: "p4", name: "D", gamesPlayed: 6, totalPoints: 144 }
  ];
  const result = calculateAverageGames(players);
  // (0 + 2 + 4 + 6) / 4 = 12 / 4 = 3
  assert.equal(result, 3);
});

test("calculateAverageGames handles all zeros", () => {
  const players: Player[] = [
    { id: "p1", name: "A", gamesPlayed: 0, totalPoints: 0 },
    { id: "p2", name: "B", gamesPlayed: 0, totalPoints: 0 },
    { id: "p3", name: "C", gamesPlayed: 0, totalPoints: 0 }
  ];
  const result = calculateAverageGames(players);
  assert.equal(result, 0);
});

test("calculateAverageGames with mixed game counts", () => {
  const players: Player[] = [
    { id: "p1", name: "A", gamesPlayed: 10, totalPoints: 240 },
    { id: "p2", name: "B", gamesPlayed: 12, totalPoints: 288 },
    { id: "p3", name: "C", gamesPlayed: 11, totalPoints: 264 }
  ];
  const result = calculateAverageGames(players);
  // (10 + 12 + 11) / 3 = 33 / 3 = 11
  assert.equal(result, 11);
});

test("calculateAverageGames with fractional result", () => {
  const players: Player[] = [
    { id: "p1", name: "A", gamesPlayed: 5, totalPoints: 120 },
    { id: "p2", name: "B", gamesPlayed: 7, totalPoints: 168 }
  ];
  const result = calculateAverageGames(players);
  // (5 + 7) / 2 = 12 / 2 = 6
  assert.equal(result, 6);
});

// ============================================================================
// calculateHandicap() Tests
// ============================================================================

test("calculateHandicap with 50% ratio (default)", () => {
  const result = calculateHandicap(10, 0.5);
  assert.equal(result, 5);
});

test("calculateHandicap with 75% ratio", () => {
  const result = calculateHandicap(8, 0.75);
  // 8 * 0.75 = 6, floor(6) = 6
  assert.equal(result, 6);
});

test("calculateHandicap with avgGames = 0", () => {
  const result = calculateHandicap(0, 0.5);
  assert.equal(result, 0);
});

test("calculateHandicap with fractional result floors down", () => {
  const result = calculateHandicap(7, 0.5);
  // 7 * 0.5 = 3.5, floor(3.5) = 3
  assert.equal(result, 3);
});

test("calculateHandicap with default ratio parameter", () => {
  const result = calculateHandicap(10);
  // Should use default 0.5: 10 * 0.5 = 5
  assert.equal(result, 5);
});

test("calculateHandicap with 100% ratio", () => {
  const result = calculateHandicap(10, 1.0);
  assert.equal(result, 10);
});

test("calculateHandicap with 25% ratio", () => {
  const result = calculateHandicap(20, 0.25);
  // 20 * 0.25 = 5
  assert.equal(result, 5);
});

test("calculateHandicap rounds down fractional handicaps", () => {
  const result = calculateHandicap(9, 0.5);
  // 9 * 0.5 = 4.5, floor(4.5) = 4
  assert.equal(result, 4);
});

// ============================================================================
// isCurrentRoundComplete() Tests
// ============================================================================

test("isCurrentRoundComplete returns true for empty rounds array", () => {
  const rounds: Round[] = [];
  const result = isCurrentRoundComplete(rounds);
  assert.equal(result, true);
});

test("isCurrentRoundComplete returns true when all matches in last round completed", () => {
  const rounds: Round[] = [
    {
      id: "r1",
      roundNumber: 1,
      isLocked: true,
      matches: [
        {
          id: "m1",
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          scoreA: 24,
          scoreB: 16,
          completed: true
        }
      ]
    }
  ];
  const result = isCurrentRoundComplete(rounds);
  assert.equal(result, true);
});

test("isCurrentRoundComplete returns false when some matches incomplete", () => {
  const rounds: Round[] = [
    {
      id: "r1",
      roundNumber: 1,
      isLocked: false,
      matches: [
        {
          id: "m1",
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          scoreA: 24,
          scoreB: 16,
          completed: true
        },
        {
          id: "m2",
          round: 1,
          court: 2,
          teamA: ["p5", "p6"],
          teamB: ["p7", "p8"],
          scoreA: undefined,
          scoreB: undefined,
          completed: false
        }
      ]
    }
  ];
  const result = isCurrentRoundComplete(rounds);
  assert.equal(result, false);
});

test("isCurrentRoundComplete checks only the last round", () => {
  const rounds: Round[] = [
    {
      id: "r1",
      roundNumber: 1,
      isLocked: true,
      matches: [
        {
          id: "m1",
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          scoreA: 24,
          scoreB: 16,
          completed: true
        }
      ]
    },
    {
      id: "r2",
      roundNumber: 2,
      isLocked: false,
      matches: [
        {
          id: "m2",
          round: 2,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p5", "p6"],
          scoreA: 24,
          scoreB: 20,
          completed: true
        }
      ]
    }
  ];
  const result = isCurrentRoundComplete(rounds);
  assert.equal(result, false, "Last round is incomplete");
});

test("isCurrentRoundComplete with multiple completed rounds", () => {
  const rounds: Round[] = [
    {
      id: "r1",
      roundNumber: 1,
      isLocked: true,
      matches: [
        {
          id: "m1",
          round: 1,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p3", "p4"],
          scoreA: 24,
          scoreB: 16,
          completed: true
        }
      ]
    },
    {
      id: "r2",
      roundNumber: 2,
      isLocked: true,
      matches: [
        {
          id: "m2",
          round: 2,
          court: 1,
          teamA: ["p1", "p2"],
          teamB: ["p5", "p6"],
          scoreA: 20,
          scoreB: 24,
          completed: true
        }
      ]
    }
  ];
  const result = isCurrentRoundComplete(rounds);
  assert.equal(result, true, "All matches in last round completed");
});

// ============================================================================
// getIntegrationWaveCount() Tests
// ============================================================================

test("getIntegrationWaveCount returns 0 for empty array", () => {
  const players: Player[] = [];
  const result = getIntegrationWaveCount(players);
  assert.equal(result, 0);
});

test("getIntegrationWaveCount returns 0 when all players are original", () => {
  const players: Player[] = [
    { id: "p1", name: "A", gamesPlayed: 3, totalPoints: 72 },
    { id: "p2", name: "B", gamesPlayed: 3, totalPoints: 68 },
    { id: "p3", name: "C", gamesPlayed: 3, totalPoints: 70 }
  ];
  const result = getIntegrationWaveCount(players);
  assert.equal(result, 0);
});

test("getIntegrationWaveCount returns max wave number from integrated players", () => {
  const players: Player[] = [
    { id: "p1", name: "A", gamesPlayed: 5, totalPoints: 120 },
    { id: "p2", name: "B", gamesPlayed: 3, totalPoints: 72, integrationWave: 1 },
    { id: "p3", name: "C", gamesPlayed: 2, totalPoints: 48, integrationWave: 1 }
  ];
  const result = getIntegrationWaveCount(players);
  assert.equal(result, 1);
});

test("getIntegrationWaveCount with multiple waves", () => {
  const players: Player[] = [
    { id: "p1", name: "A", gamesPlayed: 8, totalPoints: 192 },
    { id: "p2", name: "B", gamesPlayed: 5, totalPoints: 120, integrationWave: 1 },
    { id: "p3", name: "C", gamesPlayed: 3, totalPoints: 72, integrationWave: 2 },
    { id: "p4", name: "D", gamesPlayed: 3, totalPoints: 68, integrationWave: 2 }
  ];
  const result = getIntegrationWaveCount(players);
  assert.equal(result, 2);
});

test("getIntegrationWaveCount ignores undefined integrationWave", () => {
  const players: Player[] = [
    { id: "p1", name: "A", gamesPlayed: 5, totalPoints: 120 },
    { id: "p2", name: "B", gamesPlayed: 5, totalPoints: 115 },
    { id: "p3", name: "C", gamesPlayed: 3, totalPoints: 72, integrationWave: 1 }
  ];
  const result = getIntegrationWaveCount(players);
  assert.equal(result, 1);
});

test("getIntegrationWaveCount with wave 3 (max)", () => {
  const players: Player[] = [
    { id: "p1", name: "A", gamesPlayed: 10, totalPoints: 240 },
    { id: "p2", name: "B", gamesPlayed: 8, totalPoints: 192, integrationWave: 1 },
    { id: "p3", name: "C", gamesPlayed: 6, totalPoints: 144, integrationWave: 2 },
    { id: "p4", name: "D", gamesPlayed: 4, totalPoints: 96, integrationWave: 3 }
  ];
  const result = getIntegrationWaveCount(players);
  assert.equal(result, 3);
});

// ============================================================================
// canIntegratePlayers() Tests
// ============================================================================

test("canIntegratePlayers returns false when no pending players", () => {
  const tournament: TournamentState = {
    id: "t1",
    config: {
      name: "Test",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    },
    players: [
      { id: "p1", name: "A", gamesPlayed: 2, totalPoints: 48 },
      { id: "p2", name: "B", gamesPlayed: 2, totalPoints: 48 },
      { id: "p3", name: "C", gamesPlayed: 2, totalPoints: 48 },
      { id: "p4", name: "D", gamesPlayed: 2, totalPoints: 48 }
    ],
    rounds: [],
    version: 1,
    leaderboard: [],
    publicToken: "pub_test",
    organizerId: "org_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pendingPlayers: [],
    integrationWaveCount: 0
  };

  const result = canIntegratePlayers(tournament);

  assert.equal(result.can, false);
  assert.equal(result.reason, "Need at least 2 pending players to integrate");
});

test("canIntegratePlayers returns false when only 1 pending player", () => {
  const tournament: TournamentState = {
    id: "t1",
    config: {
      name: "Test",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    },
    players: [
      { id: "p1", name: "A", gamesPlayed: 2, totalPoints: 48 },
      { id: "p2", name: "B", gamesPlayed: 2, totalPoints: 48 },
      { id: "p3", name: "C", gamesPlayed: 2, totalPoints: 48 },
      { id: "p4", name: "D", gamesPlayed: 2, totalPoints: 48 }
    ],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        isLocked: true,
        matches: [
          {
            id: "m1",
            round: 1,
            court: 1,
            teamA: ["p1", "p2"],
            teamB: ["p3", "p4"],
            scoreA: 24,
            scoreB: 16,
            completed: true
          }
        ]
      }
    ],
    version: 2,
    leaderboard: [],
    publicToken: "pub_test",
    organizerId: "org_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pendingPlayers: [{ id: "pending_1", name: "NewPlayer", createdAt: new Date().toISOString() }],
    integrationWaveCount: 0
  };

  const result = canIntegratePlayers(tournament);

  assert.equal(result.can, false);
  assert.equal(result.reason, "Need at least 2 pending players to integrate");
});

test("canIntegratePlayers returns false when wave limit reached", () => {
  const tournament: TournamentState = {
    id: "t1",
    config: {
      name: "Test",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    },
    players: [
      { id: "p1", name: "A", gamesPlayed: 8, totalPoints: 192 },
      { id: "p2", name: "B", gamesPlayed: 8, totalPoints: 188, integrationWave: 1 },
      { id: "p3", name: "C", gamesPlayed: 6, totalPoints: 144, integrationWave: 2 },
      { id: "p4", name: "D", gamesPlayed: 4, totalPoints: 96, integrationWave: 3 }
    ],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        isLocked: true,
        matches: [
          {
            id: "m1",
            round: 1,
            court: 1,
            teamA: ["p1", "p2"],
            teamB: ["p3", "p4"],
            scoreA: 24,
            scoreB: 16,
            completed: true
          }
        ]
      }
    ],
    version: 5,
    leaderboard: [],
    publicToken: "pub_test",
    organizerId: "org_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pendingPlayers: [
      { id: "pending_1", name: "NewPlayer1", createdAt: new Date().toISOString() },
      { id: "pending_2", name: "NewPlayer2", createdAt: new Date().toISOString() }
    ],
    integrationWaveCount: 3
  };

  const result = canIntegratePlayers(tournament);

  assert.equal(result.can, false);
  assert.equal(result.reason, "Maximum integration waves (3) reached");
});

test("canIntegratePlayers returns false when current round incomplete", () => {
  const tournament: TournamentState = {
    id: "t1",
    config: {
      name: "Test",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    },
    players: [
      { id: "p1", name: "A", gamesPlayed: 2, totalPoints: 48 },
      { id: "p2", name: "B", gamesPlayed: 2, totalPoints: 44 },
      { id: "p3", name: "C", gamesPlayed: 2, totalPoints: 46 },
      { id: "p4", name: "D", gamesPlayed: 2, totalPoints: 42 }
    ],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        isLocked: true,
        matches: [
          {
            id: "m1",
            round: 1,
            court: 1,
            teamA: ["p1", "p2"],
            teamB: ["p3", "p4"],
            scoreA: 24,
            scoreB: 16,
            completed: true
          }
        ]
      },
      {
        id: "r2",
        roundNumber: 2,
        isLocked: false,
        matches: [
          {
            id: "m2",
            round: 2,
            court: 1,
            teamA: ["p1", "p3"],
            teamB: ["p2", "p4"],
            scoreA: 24,
            scoreB: 16,
            completed: true
          }
        ]
      }
    ],
    version: 3,
    leaderboard: [],
    publicToken: "pub_test",
    organizerId: "org_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pendingPlayers: [
      { id: "pending_1", name: "NewPlayer1", createdAt: new Date().toISOString() },
      { id: "pending_2", name: "NewPlayer2", createdAt: new Date().toISOString() }
    ],
    integrationWaveCount: 0
  };

  const result = canIntegratePlayers(tournament);

  assert.equal(result.can, false);
  assert.equal(result.reason, "Cannot integrate during incomplete round");
});

test("canIntegratePlayers returns true when all conditions met", () => {
  const tournament: TournamentState = {
    id: "t1",
    config: {
      name: "Test",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    },
    players: [
      { id: "p1", name: "A", gamesPlayed: 2, totalPoints: 48 },
      { id: "p2", name: "B", gamesPlayed: 2, totalPoints: 44 },
      { id: "p3", name: "C", gamesPlayed: 2, totalPoints: 46 },
      { id: "p4", name: "D", gamesPlayed: 2, totalPoints: 42 }
    ],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        isLocked: true,
        matches: [
          {
            id: "m1",
            round: 1,
            court: 1,
            teamA: ["p1", "p2"],
            teamB: ["p3", "p4"],
            scoreA: 24,
            scoreB: 16,
            completed: true
          }
        ]
      }
    ],
    version: 2,
    leaderboard: [],
    publicToken: "pub_test",
    organizerId: "org_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pendingPlayers: [
      { id: "pending_1", name: "NewPlayer1", createdAt: new Date().toISOString() },
      { id: "pending_2", name: "NewPlayer2", createdAt: new Date().toISOString() }
    ],
    integrationWaveCount: 0
  };

  const result = canIntegratePlayers(tournament);

  assert.equal(result.can, true);
  assert.equal(result.reason, undefined);
});

test("canIntegratePlayers with wave 2 and pending players", () => {
  const tournament: TournamentState = {
    id: "t1",
    config: {
      name: "Test",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    },
    players: [
      { id: "p1", name: "A", gamesPlayed: 5, totalPoints: 120 },
      { id: "p2", name: "B", gamesPlayed: 5, totalPoints: 115 },
      { id: "p3", name: "C", gamesPlayed: 3, totalPoints: 72, integrationWave: 1 },
      { id: "p4", name: "D", gamesPlayed: 3, totalPoints: 68, integrationWave: 1 }
    ],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        isLocked: true,
        matches: [
          {
            id: "m1",
            round: 1,
            court: 1,
            teamA: ["p1", "p2"],
            teamB: ["p3", "p4"],
            scoreA: 24,
            scoreB: 16,
            completed: true
          }
        ]
      }
    ],
    version: 4,
    leaderboard: [],
    publicToken: "pub_test",
    organizerId: "org_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pendingPlayers: [
      { id: "pending_3", name: "NewPlayer3", createdAt: new Date().toISOString() },
      { id: "pending_4", name: "NewPlayer4", createdAt: new Date().toISOString() }
    ],
    integrationWaveCount: 1
  };

  const result = canIntegratePlayers(tournament);

  assert.equal(result.can, true, "Should allow integration for wave 2");
  assert.equal(result.reason, undefined);
});
