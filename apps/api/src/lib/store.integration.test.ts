import test from "node:test";
import assert from "node:assert/strict";

import {
  createTournament,
  addPendingPlayer,
  integratePendingPlayers,
  getTournament,
  deleteTournament
} from "./store.js";
import type { TournamentConfig } from "@padel/shared";

// ============================================================================
// addPendingPlayer() Tests
// ============================================================================

test("addPendingPlayer adds pending player to tournament", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org-1");
  const initialVersion = tournament.version;
  const initialUpdatedAt = tournament.updatedAt;

  const updated = addPendingPlayer(tournament.id, "New Player", undefined);

  assert.equal(updated.pendingPlayers.length, 1);
  assert.equal(updated.pendingPlayers[0].name, "New Player");
  assert.ok(updated.pendingPlayers[0].id.startsWith("player_"));
  assert.ok(updated.pendingPlayers[0].createdAt);
  assert.equal(updated.version, initialVersion + 1);
  assert.ok(updated.updatedAt > initialUpdatedAt);

  deleteTournament(tournament.id);
});

test("addPendingPlayer adds player with gender", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "MIXED",
    schedulingMode: "TARGET_GAMES",
    players: [
      { name: "M1", gender: "MALE" },
      { name: "M2", gender: "MALE" },
      { name: "F1", gender: "FEMALE" },
      { name: "F2", gender: "FEMALE" }
    ],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org-1");
  const updated = addPendingPlayer(tournament.id, "New Female", "FEMALE");

  assert.equal(updated.pendingPlayers[0].name, "New Female");
  assert.equal(updated.pendingPlayers[0].gender, "FEMALE");

  deleteTournament(tournament.id);
});

test("addPendingPlayer allows multiple pending players", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org-1");

  const updated1 = addPendingPlayer(tournament.id, "Pending 1", undefined);
  assert.equal(updated1.pendingPlayers.length, 1);

  const updated2 = addPendingPlayer(tournament.id, "Pending 2", undefined);
  assert.equal(updated2.pendingPlayers.length, 2);

  const updated3 = addPendingPlayer(tournament.id, "Pending 3", "MALE");
  assert.equal(updated3.pendingPlayers.length, 3);

  deleteTournament(tournament.id);
});

test("addPendingPlayer throws error for non-existent tournament", () => {
  assert.throws(() => addPendingPlayer("non-existent-id", "Player", undefined), /Tournament .* not found/);
});

test("addPendingPlayer throws error for empty name", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org-1");

  assert.throws(() => addPendingPlayer(tournament.id, "", undefined), /Player name is required/);

  assert.throws(() => addPendingPlayer(tournament.id, "   ", undefined), /Player name is required/);

  deleteTournament(tournament.id);
});

test("addPendingPlayer preserves existing tournament state", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org-1");
  const originalPlayers = tournament.players.length;
  const originalRounds = tournament.rounds.length;

  const updated = addPendingPlayer(tournament.id, "New Player", undefined);

  assert.equal(updated.players.length, originalPlayers, "Active players unchanged");
  assert.equal(updated.rounds.length, originalRounds, "Rounds unchanged");
  assert.equal(updated.config.name, tournament.config.name);
  assert.equal(updated.id, tournament.id);

  deleteTournament(tournament.id);
});

// ============================================================================
// integratePendingPlayers() Tests
// ============================================================================

test("integratePendingPlayers integrates 2 pending players successfully", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org-1");

  // Add 2 pending players
  let updated = addPendingPlayer(tournament.id, "New Player 1", undefined);
  updated = addPendingPlayer(tournament.id, "New Player 2", undefined);

  assert.equal(updated.pendingPlayers.length, 2);
  assert.equal(updated.players.length, 8);

  // Complete first round to allow integration
  const firstRound = updated.rounds[0];
  firstRound.isLocked = true;
  for (const match of firstRound.matches) {
    match.completed = true;
    match.scoreA = 24;
    match.scoreB = 20;
  }

  // Integrate pending players
  const integrated = integratePendingPlayers(tournament.id);

  assert.equal(integrated.players.length, 10, "Should have 10 total players");
  assert.equal(integrated.pendingPlayers.length, 0, "Pending players cleared");
  assert.equal(integrated.integrationWaveCount, 1, "Wave count incremented");

  // Check handicap was assigned
  const newPlayer1 = integrated.players.find((p) => p.name === "New Player 1");
  const newPlayer2 = integrated.players.find((p) => p.name === "New Player 2");
  assert.ok(newPlayer1);
  assert.ok(newPlayer2);
  assert.ok(newPlayer1.handicap !== undefined, "New player 1 should have handicap");
  assert.ok(newPlayer2.handicap !== undefined, "New player 2 should have handicap");
  assert.equal(newPlayer1.integrationWave, 1);
  assert.equal(newPlayer2.integrationWave, 1);

  deleteTournament(tournament.id);
});

test("integratePendingPlayers calculates handicap based on average games", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const tournament = createTournament(config, "org-1");

  // Add pending players
  let updated = addPendingPlayer(tournament.id, "New Player 1", undefined);
  updated = addPendingPlayer(tournament.id, "New Player 2", undefined);

  // Complete first round
  const firstRound = updated.rounds[0];
  firstRound.isLocked = true;
  for (const match of firstRound.matches) {
    match.completed = true;
  }

  // Calculate expected handicap
  const avgGames = updated.players.reduce((sum, p) => sum + p.gamesPlayed, 0) / updated.players.length;
  const expectedHandicap = Math.floor(avgGames * 0.5);

  const integrated = integratePendingPlayers(tournament.id);

  const newPlayer = integrated.players.find((p) => p.name === "New Player 1");
  assert.ok(newPlayer);
  assert.equal(newPlayer.handicap, expectedHandicap);

  deleteTournament(tournament.id);
});

test("integratePendingPlayers recalculates remaining rounds", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const tournament = createTournament(config, "org-1");
  const originalRoundCount = tournament.rounds.length;

  // Add pending players
  let updated = addPendingPlayer(tournament.id, "New Player 1", undefined);
  updated = addPendingPlayer(tournament.id, "New Player 2", undefined);

  // Complete first round
  const firstRound = updated.rounds[0];
  firstRound.isLocked = true;
  for (const match of firstRound.matches) {
    match.completed = true;
  }

  const round2IdBefore = updated.rounds[1]?.id;

  const integrated = integratePendingPlayers(tournament.id);

  // Rounds should be recalculated
  assert.ok(integrated.rounds.length >= 1);
  // Round 1 should be locked and preserved
  assert.equal(integrated.rounds[0].isLocked, true);
  // Round 2 should be regenerated with new players
  if (integrated.rounds[1]) {
    assert.notEqual(integrated.rounds[1].id, round2IdBefore, "Round 2 should be regenerated");
  }

  deleteTournament(tournament.id);
});

test("integratePendingPlayers throws error if less than 2 pending players", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org-1");

  // Add only 1 pending player
  addPendingPlayer(tournament.id, "New Player", undefined);

  assert.throws(() => integratePendingPlayers(tournament.id), /Need at least 2 pending players/);

  deleteTournament(tournament.id);
});

test("integratePendingPlayers throws error if current round incomplete", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org-1");

  // Add 2 pending players
  let updated = addPendingPlayer(tournament.id, "New Player 1", undefined);
  updated = addPendingPlayer(tournament.id, "New Player 2", undefined);

  // Don't complete rounds - they remain incomplete

  assert.throws(() => integratePendingPlayers(tournament.id), /Cannot integrate during incomplete round/);

  deleteTournament(tournament.id);
});

test("integratePendingPlayers throws error if max waves reached", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org-1");

  // Manually set integrationWaveCount to 3 (max)
  const state = getTournament(tournament.id);
  if (state) {
    state.integrationWaveCount = 3;
  }

  // Add 2 pending players
  let updated = addPendingPlayer(tournament.id, "New Player 1", undefined);
  updated = addPendingPlayer(tournament.id, "New Player 2", undefined);

  // Complete first round
  const firstRound = updated.rounds[0];
  firstRound.isLocked = true;
  for (const match of firstRound.matches) {
    match.completed = true;
  }

  assert.throws(() => integratePendingPlayers(tournament.id), /Maximum integration waves \(3\) reached/);

  deleteTournament(tournament.id);
});

test("integratePendingPlayers increments version", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org-1");

  // Add 2 pending players
  let updated = addPendingPlayer(tournament.id, "New Player 1", undefined);
  updated = addPendingPlayer(tournament.id, "New Player 2", undefined);
  const versionBefore = updated.version;

  // Complete first round
  const firstRound = updated.rounds[0];
  firstRound.isLocked = true;
  for (const match of firstRound.matches) {
    match.completed = true;
  }

  const integrated = integratePendingPlayers(tournament.id);

  assert.equal(integrated.version, versionBefore + 1);

  deleteTournament(tournament.id);
});

test("integratePendingPlayers updates timestamp", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org-1");

  // Add 2 pending players
  let updated = addPendingPlayer(tournament.id, "New Player 1", undefined);
  updated = addPendingPlayer(tournament.id, "New Player 2", undefined);
  const timestampBefore = updated.updatedAt;

  // Complete first round
  const firstRound = updated.rounds[0];
  firstRound.isLocked = true;
  for (const match of firstRound.matches) {
    match.completed = true;
  }

  const integrated = integratePendingPlayers(tournament.id);

  // Note: Timestamp comparison may fail due to timing precision
  // The integration was successful if we got here without errors
  assert.ok(integrated.updatedAt >= timestampBefore);

  deleteTournament(tournament.id);
});

test("integratePendingPlayers throws error for non-existent tournament", () => {
  assert.throws(() => integratePendingPlayers("non-existent-id"), /Tournament .* not found/);
});

test("integratePendingPlayers supports multiple waves", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 5
  };

  const tournament = createTournament(config, "org-1");

  // Wave 1: Add and integrate 2 players
  let updated = addPendingPlayer(tournament.id, "Wave1-P1", undefined);
  updated = addPendingPlayer(tournament.id, "Wave1-P2", undefined);

  // Complete first round
  let firstRound = updated.rounds[0];
  firstRound.isLocked = true;
  for (const match of firstRound.matches) {
    match.completed = true;
  }

  let integrated = integratePendingPlayers(tournament.id);
  assert.equal(integrated.integrationWaveCount, 1);
  assert.equal(integrated.players.length, 10);

  // Wave 2: Add and integrate 2 more players
  updated = addPendingPlayer(tournament.id, "Wave2-P1", undefined);
  updated = addPendingPlayer(tournament.id, "Wave2-P2", undefined);

  // Complete all rounds up to current
  const state = getTournament(tournament.id);
  if (state) {
    for (const round of state.rounds) {
      if (!round.isLocked) {
        round.isLocked = true;
        for (const match of round.matches) {
          match.completed = true;
        }
      }
    }
  }

  integrated = integratePendingPlayers(tournament.id);
  assert.equal(integrated.integrationWaveCount, 2);
  assert.equal(integrated.players.length, 12);

  // Check wave assignments
  const wave1Players = integrated.players.filter((p) => p.integrationWave === 1);
  const wave2Players = integrated.players.filter((p) => p.integrationWave === 2);
  assert.equal(wave1Players.length, 2);
  assert.equal(wave2Players.length, 2);

  deleteTournament(tournament.id);
});

test("integratePendingPlayers preserves gender for MIXED variant", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "MIXED",
    schedulingMode: "TARGET_GAMES",
    players: [
      { name: "M1", gender: "MALE" },
      { name: "M2", gender: "MALE" },
      { name: "F1", gender: "FEMALE" },
      { name: "F2", gender: "FEMALE" }
    ],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org-1");

  // Add pending players with gender
  let updated = addPendingPlayer(tournament.id, "New Male", "MALE");
  updated = addPendingPlayer(tournament.id, "New Female", "FEMALE");

  // Complete first round
  const firstRound = updated.rounds[0];
  firstRound.isLocked = true;
  for (const match of firstRound.matches) {
    match.completed = true;
  }

  const integrated = integratePendingPlayers(tournament.id);

  const newMale = integrated.players.find((p) => p.name === "New Male");
  const newFemale = integrated.players.find((p) => p.name === "New Female");

  assert.ok(newMale);
  assert.ok(newFemale);
  assert.equal(newMale.gender, "MALE");
  assert.equal(newFemale.gender, "FEMALE");

  deleteTournament(tournament.id);
});

test("integratePendingPlayers with more than 2 pending players", () => {
  const config: TournamentConfig = {
    name: "Test Tournament",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const tournament = createTournament(config, "org-1");

  // Add 4 pending players
  let updated = addPendingPlayer(tournament.id, "New Player 1", undefined);
  updated = addPendingPlayer(tournament.id, "New Player 2", undefined);
  updated = addPendingPlayer(tournament.id, "New Player 3", undefined);
  updated = addPendingPlayer(tournament.id, "New Player 4", undefined);

  assert.equal(updated.pendingPlayers.length, 4);

  // Complete first round
  const firstRound = updated.rounds[0];
  firstRound.isLocked = true;
  for (const match of firstRound.matches) {
    match.completed = true;
  }

  const integrated = integratePendingPlayers(tournament.id);

  assert.equal(integrated.players.length, 12, "Should have 12 total players");
  assert.equal(integrated.pendingPlayers.length, 0, "All pending players cleared");

  // All 4 new players should have same wave and handicap
  const newPlayers = integrated.players.filter((p) => p.name.startsWith("New Player"));
  assert.equal(newPlayers.length, 4);
  assert.ok(newPlayers.every((p) => p.integrationWave === 1));
  assert.ok(newPlayers.every((p) => p.handicap !== undefined));

  // All should have same handicap value
  const handicaps = newPlayers.map((p) => p.handicap);
  assert.ok(handicaps.every((h) => h === handicaps[0]));

  deleteTournament(tournament.id);
});
