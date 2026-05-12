import test from "node:test";
import assert from "node:assert/strict";

import { generateMexicano } from "./mexicanoScheduler.js";
import { maxGamesDelta } from "./fairnessEvaluator.js";
import type { TournamentConfig } from "@padel/shared";

test("generateMexicano creates valid tournament", () => {
  const config: TournamentConfig = {
    name: "Mexicano Tournament",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const { players, rounds } = generateMexicano(config);

  assert.equal(players.length, 8);
  assert.ok(rounds.length > 0);
  assert.ok(maxGamesDelta(players) <= 1, "Should maintain fairness");
});

test("generateMexicano with minimum players", () => {
  const config: TournamentConfig = {
    name: "Small Mexicano",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const { players, rounds } = generateMexicano(config);

  assert.equal(players.length, 4);
  assert.ok(rounds.length > 0);
});

test("generateMexicano with 8+ players sorts rounds", () => {
  const config: TournamentConfig = {
    name: "Mexicano Tournament",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const { rounds } = generateMexicano(config);

  // Verify rounds are sorted by round number
  for (let i = 0; i < rounds.length - 1; i++) {
    assert.ok(rounds[i].roundNumber <= rounds[i + 1].roundNumber, "Rounds should be sorted sequentially");
  }
});

test("generateMexicano with fewer than 8 players", () => {
  const config: TournamentConfig = {
    name: "Small Mexicano",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 6 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const { players, rounds } = generateMexicano(config);

  assert.equal(players.length, 6);
  assert.ok(rounds.length > 0);
});

test("generateMexicano MIXED variant", () => {
  const config: TournamentConfig = {
    name: "Mixed Mexicano",
    mode: "MEXICANO",
    variant: "MIXED",
    schedulingMode: "TARGET_GAMES",
    players: [
      { name: "M1", gender: "MALE" },
      { name: "M2", gender: "MALE" },
      { name: "M3", gender: "MALE" },
      { name: "M4", gender: "MALE" },
      { name: "F1", gender: "FEMALE" },
      { name: "F2", gender: "FEMALE" },
      { name: "F3", gender: "FEMALE" },
      { name: "F4", gender: "FEMALE" }
    ],
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const { players, rounds } = generateMexicano(config);

  assert.equal(players.length, 8);
  assert.equal(players.filter((p) => p.gender === "MALE").length, 4);
  assert.equal(players.filter((p) => p.gender === "FEMALE").length, 4);
  assert.ok(rounds.length > 0);
});

test("generateMexicano ROUND_ROBIN scheduling", () => {
  const config: TournamentConfig = {
    name: "Round Robin Mexicano",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "ROUND_ROBIN",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24
  };

  const { players, rounds } = generateMexicano(config);

  assert.equal(players.length, 8);
  // Round robin = N-1 rounds for N players
  assert.equal(rounds.length, 7);
});

test("generateMexicano large tournament", () => {
  const config: TournamentConfig = {
    name: "Large Mexicano",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 20 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 4,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const { players, rounds } = generateMexicano(config);

  assert.equal(players.length, 20);
  assert.ok(rounds.length > 0);
  assert.ok(maxGamesDelta(players) <= 1, "Should maintain fairness with 20 players");
});

test("generateMexicano players have correct initial state", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const { players } = generateMexicano(config);

  for (const player of players) {
    assert.ok(player.id.startsWith("player_"));
    assert.equal(player.totalPoints, 0, "New player should have 0 points");
    assert.ok(player.gamesPlayed >= 0);
  }
});

test("generateMexicano rounds have valid structure", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const { rounds } = generateMexicano(config);

  for (const round of rounds) {
    assert.ok(round.id.startsWith("round_"));
    assert.ok(round.roundNumber >= 1);
    assert.equal(typeof round.isLocked, "boolean");
    assert.ok(Array.isArray(round.matches));

    for (const match of round.matches) {
      assert.ok(match.id.startsWith("match_"));
      assert.equal(match.teamA.length, 2);
      assert.equal(match.teamB.length, 2);
      assert.equal(match.completed, false);
    }
  }
});
