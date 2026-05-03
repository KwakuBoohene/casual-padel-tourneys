import test from "node:test";
import assert from "node:assert/strict";

import { estimateTournament, matchTimeMinutes } from "./timeEstimator.js";
import type { TournamentConfig } from "@padel/shared";

// ============================================================================
// matchTimeMinutes() Tests
// ============================================================================

test("matchTimeMinutes calculates correct duration for 24 points", () => {
  const result = matchTimeMinutes(24);
  const expected = (24 * 35) / 60; // 14 minutes
  assert.equal(result, expected);
  assert.equal(result, 14);
});

test("matchTimeMinutes calculates correct duration for 32 points", () => {
  const result = matchTimeMinutes(32);
  const expected = (32 * 35) / 60; // ~18.67 minutes
  assert.equal(result, expected);
  assert.ok(Math.abs(result - 18.67) < 0.01);
});

test("matchTimeMinutes calculates correct duration for 16 points", () => {
  const result = matchTimeMinutes(16);
  const expected = (16 * 35) / 60; // ~9.33 minutes
  assert.equal(result, expected);
  assert.ok(Math.abs(result - 9.33) < 0.01);
});

test("matchTimeMinutes with 0 points returns 0", () => {
  const result = matchTimeMinutes(0);
  assert.equal(result, 0);
});

test("matchTimeMinutes with large point value", () => {
  const result = matchTimeMinutes(100);
  const expected = (100 * 35) / 60; // ~58.33 minutes
  assert.equal(result, expected);
});

// ============================================================================
// estimateTournament() Tests - Structure and Basic Validation
// ============================================================================

test("estimateTournament returns correct structure", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const result = estimateTournament(config);

  assert.ok(result.rounds !== undefined, "Should have rounds property");
  assert.ok(result.gamesPerPlayer !== undefined, "Should have gamesPerPlayer property");
  assert.ok(result.durationMinutes !== undefined, "Should have durationMinutes property");
  assert.ok(typeof result.rounds === "number", "rounds should be a number");
  assert.ok(typeof result.gamesPerPlayer === "number", "gamesPerPlayer should be a number");
  assert.ok(typeof result.durationMinutes === "number", "durationMinutes should be a number");
});

// ============================================================================
// estimateTournament() Tests - TARGET_GAMES Mode
// ============================================================================

test("estimateTournament TARGET_GAMES mode - 8 players, 2 courts, 3 games each", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const result = estimateTournament(config);

  // playersPerRound = 2 courts * 4 = 8
  // rounds = ceil((8 players * 3 games) / 8) = ceil(24/8) = 3
  assert.equal(result.rounds, 3);
  assert.equal(result.gamesPerPlayer, 3);
  assert.equal(result.durationMinutes, 3 * 14); // 3 rounds * 14 min per match
});

test("estimateTournament TARGET_GAMES mode - 12 players, 2 courts, 4 games each", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 12 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const result = estimateTournament(config);

  // playersPerRound = 2 courts * 4 = 8
  // rounds = ceil((12 players * 4 games) / 8) = ceil(48/8) = 6
  assert.equal(result.rounds, 6);
  assert.equal(result.gamesPerPlayer, 4);
  assert.equal(result.durationMinutes, 6 * 14);
});

test("estimateTournament TARGET_GAMES mode - 6 players, 1 court", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 6 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const result = estimateTournament(config);

  // playersPerRound = 1 court * 4 = 4
  // rounds = ceil((6 players * 3 games) / 4) = ceil(18/4) = 5
  assert.equal(result.rounds, 5);
  assert.ok(result.gamesPerPlayer >= 3); // Should be close to target
});

test("estimateTournament TARGET_GAMES mode - handles fractional rounds", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 10 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 3,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 5
  };

  const result = estimateTournament(config);

  // playersPerRound = 3 courts * 4 = 12
  // rounds = ceil((10 players * 5 games) / 12) = ceil(50/12) = ceil(4.17) = 5
  assert.equal(result.rounds, 5);
  assert.ok(result.gamesPerPlayer >= 4); // With 5 rounds and 12 players/round, should be at least 4
});

// ============================================================================
// estimateTournament() Tests - ROUND_ROBIN Mode
// ============================================================================

test("estimateTournament ROUND_ROBIN mode - 8 players", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "ROUND_ROBIN",
    players: Array.from({ length: 8 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 2,
    pointsPerMatch: 24
  };

  const result = estimateTournament(config);

  // ROUND_ROBIN: rounds = players - 1 = 8 - 1 = 7
  assert.equal(result.rounds, 7);
  assert.equal(result.durationMinutes, 7 * 14);
});

test("estimateTournament ROUND_ROBIN mode - 4 players", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "ROUND_ROBIN",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24
  };

  const result = estimateTournament(config);

  // ROUND_ROBIN: rounds = 4 - 1 = 3
  assert.equal(result.rounds, 3);
});

test("estimateTournament ROUND_ROBIN mode - minimum 1 round", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "ROUND_ROBIN",
    players: [{ name: "A" }],
    courts: 1,
    pointsPerMatch: 24
  };

  const result = estimateTournament(config);

  // Even with 1 player (edge case), should return at least 1 round
  assert.equal(result.rounds, 1);
});

test("estimateTournament ROUND_ROBIN mode - 16 players", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "ROUND_ROBIN",
    players: Array.from({ length: 16 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 3,
    pointsPerMatch: 32
  };

  const result = estimateTournament(config);

  // ROUND_ROBIN: rounds = 16 - 1 = 15
  // matchTime for 32 points = (32 * 35) / 60 = 18.67
  assert.equal(result.rounds, 15);
  assert.equal(result.durationMinutes, Math.ceil(15 * matchTimeMinutes(32)));
});

// ============================================================================
// estimateTournament() Tests - TOTAL_TIME Mode
// ============================================================================

test("estimateTournament TOTAL_TIME mode - 90 minutes tournament", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: Array.from({ length: 8 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 2,
    pointsPerMatch: 24,
    tournamentTimeMinutes: 90
  };

  const result = estimateTournament(config);

  // matchTime = 14 minutes
  // rounds = ceil(90 / 14) = ceil(6.43) = 7
  const matchTime = matchTimeMinutes(24);
  const expectedRounds = Math.ceil(90 / matchTime);
  assert.equal(result.rounds, expectedRounds);
  assert.equal(result.durationMinutes, Math.ceil(expectedRounds * matchTime));
});

test("estimateTournament TOTAL_TIME mode - 60 minutes tournament", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: Array.from({ length: 12 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 3,
    pointsPerMatch: 32,
    tournamentTimeMinutes: 60
  };

  const result = estimateTournament(config);

  // matchTime for 32 points = (32 * 35) / 60 = 18.67
  // rounds = ceil(60 / 18.67) = ceil(3.21) = 4
  const matchTime = matchTimeMinutes(32);
  const expectedRounds = Math.ceil(60 / matchTime);
  assert.equal(result.rounds, expectedRounds);
});

test("estimateTournament TOTAL_TIME mode - short tournament", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: Array.from({ length: 8 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 2,
    pointsPerMatch: 24,
    tournamentTimeMinutes: 20
  };

  const result = estimateTournament(config);

  // matchTime = 14 minutes
  // rounds = ceil(20 / 14) = ceil(1.43) = 2
  assert.equal(result.rounds, 2);
});

test("estimateTournament TOTAL_TIME mode - uses default 90 minutes if not specified", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: Array.from({ length: 8 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 2,
    pointsPerMatch: 24
    // tournamentTimeMinutes not specified
  };

  const result = estimateTournament(config);

  // Should use default 90 minutes
  // matchTime = 14 minutes
  // rounds = ceil(90 / 14) = 7
  const matchTime = matchTimeMinutes(24);
  const expectedRounds = Math.ceil(90 / matchTime);
  assert.equal(result.rounds, expectedRounds);
});

// ============================================================================
// estimateTournament() Tests - Edge Cases
// ============================================================================

test("estimateTournament ensures minimum 1 round", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }],
    courts: 5, // More courts than needed
    pointsPerMatch: 24,
    targetGamesPerPlayer: 1
  };

  const result = estimateTournament(config);

  // Even if calculation yields < 1, should return at least 1
  assert.ok(result.rounds >= 1);
});

test("estimateTournament ensures minimum 1 gamesPerPlayer", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: Array.from({ length: 20 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 1,
    pointsPerMatch: 24,
    tournamentTimeMinutes: 15 // Very short time
  };

  const result = estimateTournament(config);

  assert.ok(result.gamesPerPlayer >= 1);
});

test("estimateTournament duration is always rounded up", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: String.fromCharCode(65 + i) })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const result = estimateTournament(config);

  // Duration should be a whole number (rounded up with Math.ceil)
  assert.equal(result.durationMinutes, Math.floor(result.durationMinutes));
});

test("estimateTournament with MIXED variant (no impact on calculation)", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "MIXED",
    schedulingMode: "TARGET_GAMES",
    players: [
      { name: "A", gender: "MALE" },
      { name: "B", gender: "FEMALE" },
      { name: "C", gender: "MALE" },
      { name: "D", gender: "FEMALE" }
    ],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const result = estimateTournament(config);

  // MIXED variant shouldn't affect time estimation
  // playersPerRound = 1 * 4 = 4
  // rounds = ceil((4 * 3) / 4) = 3
  assert.equal(result.rounds, 3);
});
