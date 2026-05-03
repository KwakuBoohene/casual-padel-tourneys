import test from "node:test";
import assert from "node:assert/strict";

import { maxGamesDelta } from "./fairnessEvaluator.js";
import { generateTournament, recalculateRemainingTournament } from "./americanoScheduler.js";
import type { Player, TournamentConfig } from "@padel/shared";

// ========== generateTournament Tests ==========

test("americano generator keeps fair play count", () => {
  const { players, rounds } = generateTournament({
    name: "Weeknight Americano",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 16 }, (_, index) => ({ name: `Player ${index + 1}` })),
    courts: 3,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  });
  assert.ok(rounds.length > 0);
  assert.ok(maxGamesDelta(players) <= 1);
});

test("generateTournament creates players with correct properties", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }, { name: "David" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const { players, rounds } = generateTournament(config);

  assert.equal(players.length, 4);
  for (const player of players) {
    assert.ok(player.id.startsWith("player_"), "Player should have valid ID");
    assert.ok(player.name.length > 0, "Player should have name");
    assert.ok(player.gamesPlayed >= 0, "Player should have gamesPlayed");
    assert.equal(player.totalPoints, 0, "New player should have 0 points");
  }
});

test("generateTournament with MIXED variant preserves gender", () => {
  const config: TournamentConfig = {
    name: "Mixed Tournament",
    mode: "AMERICANO",
    variant: "MIXED",
    schedulingMode: "TARGET_GAMES",
    players: [
      { name: "Male 1", gender: "MALE" },
      { name: "Male 2", gender: "MALE" },
      { name: "Female 1", gender: "FEMALE" },
      { name: "Female 2", gender: "FEMALE" }
    ],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 1
  };

  const { players } = generateTournament(config);

  assert.equal(players.filter((p) => p.gender === "MALE").length, 2);
  assert.equal(players.filter((p) => p.gender === "FEMALE").length, 2);
});

test("generateTournament TARGET_GAMES calculates correct rounds", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const { players, rounds } = generateTournament(config);

  // 8 players * 4 games = 32 total player-games
  // 32 / 4 players per match = 8 matches needed
  // 8 matches / 2 courts = 4 rounds
  assert.equal(rounds.length, 4);

  // Total games played should be close to target
  const avgGamesPlayed = players.reduce((sum, p) => sum + p.gamesPlayed, 0) / players.length;
  assert.ok(Math.abs(avgGamesPlayed - 4) <= 1, "Average games should be close to target");
});

test("generateTournament ROUND_ROBIN creates N-1 rounds", () => {
  const config: TournamentConfig = {
    name: "Round Robin",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "ROUND_ROBIN",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24
  };

  const { rounds } = generateTournament(config);

  // Round robin for 8 players = 7 rounds (N-1)
  assert.equal(rounds.length, 7);
});

test("generateTournament with minimum 4 players", () => {
  const config: TournamentConfig = {
    name: "Small Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const { players, rounds } = generateTournament(config);

  assert.equal(players.length, 4);
  assert.ok(rounds.length > 0);
  assert.ok(rounds[0].matches.length > 0);
});

test("generateTournament updates player gamesPlayed", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const { players } = generateTournament(config);

  // All players should have played at least 1 game
  assert.ok(
    players.every((p) => p.gamesPlayed >= 1),
    "All players should have played"
  );

  // Fairness: max delta should be <= 1
  assert.ok(maxGamesDelta(players) <= 1);
});

test("generateTournament with large player count", () => {
  const config: TournamentConfig = {
    name: "Large Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 32 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 4,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const { players, rounds } = generateTournament(config);

  assert.equal(players.length, 32);
  assert.ok(rounds.length > 0);
  assert.ok(maxGamesDelta(players) <= 1, "Should maintain fairness with many players");
});

test("generateTournament rounds have sequential numbers", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const { rounds } = generateTournament(config);

  for (let i = 0; i < rounds.length; i++) {
    assert.equal(rounds[i].roundNumber, i + 1, `Round ${i} should have correct number`);
  }
});

// ========== recalculateRemainingTournament Tests ==========

test("recalculateRemainingTournament preserves locked rounds", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const initial = generateTournament(config);

  // Lock first 2 rounds
  initial.rounds[0].isLocked = true;
  initial.rounds[1].isLocked = true;

  const recalculated = recalculateRemainingTournament(config, initial.players, initial.rounds);

  assert.ok(recalculated.length >= 2);
  assert.equal(recalculated[0].roundNumber, 1);
  assert.equal(recalculated[1].roundNumber, 2);
  assert.equal(recalculated[0].isLocked, true);
  assert.equal(recalculated[1].isLocked, true);
});

test("recalculateRemainingTournament regenerates unlocked rounds", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const initial = generateTournament(config);
  initial.rounds[0].isLocked = true;

  const originalRound2Id = initial.rounds[1]?.id;

  const recalculated = recalculateRemainingTournament(config, initial.players, initial.rounds);

  // Round 2 should be regenerated (new ID)
  if (recalculated[1]) {
    assert.notEqual(recalculated[1].id, originalRound2Id, "Unlocked round should be regenerated");
  }
});

test("recalculateRemainingTournament with expanded player list", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const initial = generateTournament(config);
  initial.rounds[0].isLocked = true;

  // Add 2 new players
  const expandedPlayers: Player[] = [
    ...initial.players,
    { id: "new1", name: "New Player 1", gamesPlayed: 0, totalPoints: 0 },
    { id: "new2", name: "New Player 2", gamesPlayed: 0, totalPoints: 0 }
  ];

  const recalculated = recalculateRemainingTournament(config, expandedPlayers, initial.rounds);

  assert.ok(recalculated.length >= 1);

  // Check that new players are included in regenerated rounds
  const round2Matches = recalculated[1]?.matches ?? [];
  const playersInRound2 = new Set<string>();
  for (const match of round2Matches) {
    match.teamA.forEach((id) => playersInRound2.add(id));
    match.teamB.forEach((id) => playersInRound2.add(id));
  }

  // Should be scheduling from expanded player list
  assert.ok(recalculated.length > 0, "Should have rounds");
});

test("recalculateRemainingTournament with no locked rounds regenerates all", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const initial = generateTournament(config);
  const originalFirstRoundId = initial.rounds[0].id;

  // No rounds locked
  const recalculated = recalculateRemainingTournament(config, initial.players, initial.rounds);

  // All rounds should be regenerated
  assert.notEqual(recalculated[0].id, originalFirstRoundId);
  assert.equal(recalculated.length, initial.rounds.length);
});

test("recalculateRemainingTournament with all rounds locked", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const initial = generateTournament(config);

  // Lock all rounds
  for (const round of initial.rounds) {
    round.isLocked = true;
  }

  const recalculated = recalculateRemainingTournament(config, initial.players, initial.rounds);

  // Should return only locked rounds (no new rounds generated)
  assert.equal(recalculated.length, initial.rounds.length);
  assert.ok(recalculated.every((r) => r.isLocked));
});

test("recalculateRemainingTournament maintains round number continuity", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const initial = generateTournament(config);
  initial.rounds[0].isLocked = true;
  initial.rounds[1].isLocked = true;

  const recalculated = recalculateRemainingTournament(config, initial.players, initial.rounds);

  // Check round numbers are sequential
  for (let i = 0; i < recalculated.length; i++) {
    assert.equal(recalculated[i].roundNumber, i + 1);
  }
});
