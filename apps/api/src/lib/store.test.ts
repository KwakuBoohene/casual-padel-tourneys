import test from "node:test";
import assert from "node:assert/strict";

import {
  createTournament,
  submitScore,
  renamePlayer,
  substitutePlayer,
  adjustCourts,
  assertVersion,
  getTournament,
  getTournamentByPublicToken,
  putTournament,
  deleteTournament
} from "./store.js";
import type { TournamentConfig } from "@padel/shared";

// ============================================================================
// createTournament() Tests
// ============================================================================

test("createTournament creates AMERICANO tournament with valid config", () => {
  const config: TournamentConfig = {
    name: "Friday Night",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [
      { name: "Alice" },
      { name: "Bob" },
      { name: "Charlie" },
      { name: "Dana" },
      { name: "Eve" },
      { name: "Frank" },
      { name: "Grace" },
      { name: "Hank" }
    ],
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org_123");

  assert.ok(tournament.id.startsWith("tournament_"), "Tournament ID should have correct prefix");
  assert.equal(tournament.organizerId, "org_123");
  assert.equal(tournament.config.name, "Friday Night");
  assert.equal(tournament.players.length, 8);
  assert.equal(tournament.version, 0, "Initial version should be 0");
  assert.ok(tournament.publicToken.startsWith("public_"), "Public token should have correct prefix");
  assert.ok(tournament.rounds.length > 0, "Should have generated rounds");
  assert.ok(tournament.leaderboard.length === 8, "Leaderboard should have all players");
  assert.ok(tournament.createdAt, "Should have createdAt timestamp");
  assert.ok(tournament.updatedAt, "Should have updatedAt timestamp");
});

test("createTournament creates MEXICANO tournament", () => {
  const config: TournamentConfig = {
    name: "Mexicano Night",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [
      { name: "A" },
      { name: "B" },
      { name: "C" },
      { name: "D" },
      { name: "E" },
      { name: "F" },
      { name: "G" },
      { name: "H" }
    ],
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const tournament = createTournament(config, "org_456");

  assert.equal(tournament.config.mode, "MEXICANO");
  assert.ok(tournament.rounds.length > 0);
  assert.equal(tournament.players.length, 8);
});

test("createTournament assigns unique IDs to players, rounds, and matches", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_789");

  // Check player IDs are unique
  const playerIds = tournament.players.map((p) => p.id);
  const uniquePlayerIds = new Set(playerIds);
  assert.equal(playerIds.length, uniquePlayerIds.size, "Player IDs should be unique");

  // Check round IDs are unique
  const roundIds = tournament.rounds.map((r) => r.id);
  const uniqueRoundIds = new Set(roundIds);
  assert.equal(roundIds.length, uniqueRoundIds.size, "Round IDs should be unique");

  // Check match IDs are unique
  const matchIds = tournament.rounds.flatMap((r) => r.matches.map((m) => m.id));
  const uniqueMatchIds = new Set(matchIds);
  assert.equal(matchIds.length, uniqueMatchIds.size, "Match IDs should be unique");
});

test("createTournament initializes players with zero stats", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_test");

  // First round players should have gamesPlayed > 0 after generation
  // But totalPoints should be 0 until scores submitted
  tournament.players.forEach((player) => {
    assert.equal(player.totalPoints, 0, "Initial totalPoints should be 0");
    assert.ok(player.gamesPlayed >= 0, "gamesPlayed should be non-negative");
  });
});

test("createTournament stores tournament in memory", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_store");
  const retrieved = getTournament(tournament.id);

  assert.ok(retrieved, "Tournament should be retrievable from store");
  assert.equal(retrieved?.id, tournament.id);
});

// ============================================================================
// submitScore() Tests
// ============================================================================

test("submitScore updates match scores and marks as completed", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_score");
  const matchId = tournament.rounds[0].matches[0].id;

  const updated = submitScore(tournament.id, matchId, 24, 16);

  const match = updated.rounds[0].matches.find((m) => m.id === matchId);
  assert.ok(match, "Match should exist");
  assert.equal(match.scoreA, 24);
  assert.equal(match.scoreB, 16);
  assert.equal(match.completed, true);
});

test("submitScore awards points to all 4 players", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_points");
  const match = tournament.rounds[0].matches[0];
  const [playerA, playerB] = match.teamA;
  const [playerC, playerD] = match.teamB;

  const updated = submitScore(tournament.id, match.id, 24, 16);

  const getPlayer = (id: string) => updated.players.find((p) => p.id === id);
  assert.equal(getPlayer(playerA)?.totalPoints, 24, "TeamA player 1 should have 24 points");
  assert.equal(getPlayer(playerB)?.totalPoints, 24, "TeamA player 2 should have 24 points");
  assert.equal(getPlayer(playerC)?.totalPoints, 16, "TeamB player 1 should have 16 points");
  assert.equal(getPlayer(playerD)?.totalPoints, 16, "TeamB player 2 should have 16 points");
});

test("submitScore locks round when all matches completed", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_lock");
  const matchId = tournament.rounds[0].matches[0].id;

  assert.equal(tournament.rounds[0].isLocked, false, "Round should not be locked initially");

  const updated = submitScore(tournament.id, matchId, 24, 16);

  assert.equal(updated.rounds[0].isLocked, true, "Round should be locked after all matches completed");
});

test("submitScore increments version", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_version");
  const matchId = tournament.rounds[0].matches[0].id;
  const initialVersion = tournament.version;

  const updated = submitScore(tournament.id, matchId, 24, 16);

  assert.equal(updated.version, initialVersion + 1);
});

test("submitScore updates leaderboard", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_leaderboard");
  const match = tournament.rounds[0].matches[0];

  const updated = submitScore(tournament.id, match.id, 24, 16);

  // TeamA scored 24, TeamB scored 16 - TeamA players should rank higher
  assert.ok(updated.leaderboard.length > 0);
  assert.equal(updated.leaderboard[0].totalPoints, 24, "Top player should have 24 points");
});

test("submitScore rejects resubmission for completed match", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_idempotency");
  const match = tournament.rounds[0].matches[0];
  const [playerA] = match.teamA;

  submitScore(tournament.id, match.id, 24, 16);
  const pointsAfterFirstSubmit = tournament.players.find((p) => p.id === playerA)?.totalPoints;

  assert.throws(() => submitScore(tournament.id, match.id, 24, 16), /Match already scored\./);

  const pointsAfterSecondSubmitAttempt = tournament.players.find((p) => p.id === playerA)?.totalPoints;
  assert.equal(pointsAfterFirstSubmit, 24);
  assert.equal(pointsAfterSecondSubmitAttempt, 24);
});

// ============================================================================
// renamePlayer() Tests
// ============================================================================

test("renamePlayer changes player name", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "OldName" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_rename");
  const playerId = tournament.players[0].id;

  const updated = renamePlayer(tournament.id, playerId, "NewName");

  const player = updated.players.find((p) => p.id === playerId);
  assert.equal(player?.name, "NewName");
});

test("renamePlayer preserves player ID", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "Alice" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_preserve");
  const originalId = tournament.players[0].id;

  const updated = renamePlayer(tournament.id, originalId, "Alicia");

  const player = updated.players.find((p) => p.name === "Alicia");
  assert.equal(player?.id, originalId, "Player ID should remain unchanged");
});

test("renamePlayer increments version", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "Alice" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_ver");
  const playerId = tournament.players[0].id;
  const initialVersion = tournament.version;

  const updated = renamePlayer(tournament.id, playerId, "NewName");

  assert.equal(updated.version, initialVersion + 1);
});

test("renamePlayer throws error for non-existent player", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_error");

  assert.throws(() => renamePlayer(tournament.id, "nonexistent_id", "NewName"), /Player not found/);
});

// ============================================================================
// substitutePlayer() Tests
// ============================================================================

test("substitutePlayer changes player name", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "Original" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_sub");
  const playerId = tournament.players[0].id;

  const updated = substitutePlayer(tournament.id, playerId, "Substitute");

  const player = updated.players.find((p) => p.id === playerId);
  assert.equal(player?.name, "Substitute");
});

test("substitutePlayer preserves gamesPlayed and totalPoints", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_stats");
  const match = tournament.rounds[0].matches[0];
  const playerId = match.teamA[0];

  // Submit score to give player some points
  submitScore(tournament.id, match.id, 24, 16);

  const beforeSub = getTournament(tournament.id);
  const playerBefore = beforeSub?.players.find((p) => p.id === playerId);
  const pointsBefore = playerBefore?.totalPoints ?? 0;
  const gamesBefore = playerBefore?.gamesPlayed ?? 0;

  const updated = substitutePlayer(tournament.id, playerId, "Substitute");

  const playerAfter = updated.players.find((p) => p.id === playerId);
  assert.equal(playerAfter?.totalPoints, pointsBefore, "totalPoints should be preserved");
  assert.equal(playerAfter?.gamesPlayed, gamesBefore, "gamesPlayed should be preserved");
});

test("substitutePlayer increments version", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_subver");
  const playerId = tournament.players[0].id;
  const initialVersion = tournament.version;

  const updated = substitutePlayer(tournament.id, playerId, "Substitute");

  assert.equal(updated.version, initialVersion + 1);
});

// ============================================================================
// adjustCourts() Tests
// ============================================================================

test("adjustCourts updates court count", () => {
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

  const tournament = createTournament(config, "org_adjust");

  const updated = adjustCourts(tournament.id, 3);

  assert.equal(updated.config.courts, 3);
});

test("adjustCourts recalculates remaining tournament", () => {
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

  const tournament = createTournament(config, "org_recalc");
  const initialRoundCount = tournament.rounds.length;

  const updated = adjustCourts(tournament.id, 3);

  // With more courts, should have different schedule
  // (Note: exact behavior depends on recalculateRemainingTournament logic)
  assert.ok(updated.rounds.length > 0, "Should still have rounds after adjustment");
});

test("adjustCourts preserves locked rounds", () => {
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

  const tournament = createTournament(config, "org_locked");
  const matchId = tournament.rounds[0].matches[0].id;

  // Complete first round to lock it
  submitScore(tournament.id, matchId, 24, 16);

  const beforeAdjust = getTournament(tournament.id);
  assert.equal(beforeAdjust?.rounds[0].isLocked, true, "First round should be locked");

  const updated = adjustCourts(tournament.id, 2);

  assert.equal(updated.rounds[0].isLocked, true, "Locked round should remain locked");
  assert.equal(updated.rounds[0].matches[0].id, matchId, "Locked match should be preserved");
});

test("adjustCourts increments version", () => {
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

  const tournament = createTournament(config, "org_adjver");
  const initialVersion = tournament.version;

  const updated = adjustCourts(tournament.id, 3);

  assert.equal(updated.version, initialVersion + 1);
});

// ============================================================================
// assertVersion() Tests
// ============================================================================

test("assertVersion passes silently on correct version", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_assert");

  // Should not throw
  assertVersion(tournament.id, 0);
});

test("assertVersion throws error on version mismatch", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_mismatch");

  assert.throws(() => assertVersion(tournament.id, 999), /Version mismatch/);
});

test("assertVersion after mutation increments version", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_mut");

  assertVersion(tournament.id, 0); // Should pass

  renamePlayer(tournament.id, tournament.players[0].id, "NewName");

  assertVersion(tournament.id, 1); // Should pass after mutation

  assert.throws(
    () => assertVersion(tournament.id, 0), // Old version should fail
    /Version mismatch/
  );
});

// ============================================================================
// getTournament() and getTournamentByPublicToken() Tests
// ============================================================================

test("getTournament retrieves tournament by ID", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_get");
  const retrieved = getTournament(tournament.id);

  assert.ok(retrieved);
  assert.equal(retrieved.id, tournament.id);
});

test("getTournament returns undefined for non-existent ID", () => {
  const retrieved = getTournament("nonexistent_tournament_id");
  assert.equal(retrieved, undefined);
});

test("getTournamentByPublicToken retrieves tournament", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_public");
  const retrieved = getTournamentByPublicToken(tournament.publicToken);

  assert.ok(retrieved);
  assert.equal(retrieved.id, tournament.id);
});

test("getTournamentByPublicToken returns undefined for non-existent token", () => {
  const retrieved = getTournamentByPublicToken("nonexistent_token");
  assert.equal(retrieved, undefined);
});

// ============================================================================
// In-Memory Cache Tests
// ============================================================================

test("cache evicts oldest completed tournament when over capacity", () => {
  // Note: This test creates 102 tournaments to trigger eviction
  // The first completed tournament should be evicted
  const tournaments: string[] = [];

  // Create 101 tournaments
  for (let i = 0; i < 101; i++) {
    const config: TournamentConfig = {
      name: `Test ${i}`,
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
      courts: 1,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 1
    };
    const t = createTournament(config, `org_cache_${i}`);
    tournaments.push(t.id);

    // Complete the first tournament
    if (i === 0) {
      const match = t.rounds[0].matches[0];
      submitScore(t.id, match.id, 24, 16);
    }
  }

  // First tournament should still exist (we have 101 < 100... wait, MAX is 100)
  // Actually with 101, eviction should have happened
  const firstTournament = getTournament(tournaments[0]);

  // The first (completed) tournament should be evicted when we exceed capacity
  assert.equal(firstTournament, undefined, "Oldest completed tournament should be evicted");
});

test("cache prioritizes evicting completed tournaments", () => {
  // Create tournaments, complete some, verify incomplete ones are kept
  const completedId = createTournament(
    {
      name: "Completed",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
      courts: 1,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 1
    },
    "org_completed"
  ).id;

  // Complete this tournament
  const completed = getTournament(completedId);
  if (completed) {
    const match = completed.rounds[0].matches[0];
    submitScore(completedId, match.id, 24, 16);
  }

  const incompleteIds: string[] = [];
  // Create many incomplete tournaments to trigger eviction
  for (let i = 0; i < 100; i++) {
    const t = createTournament(
      {
        name: `Incomplete ${i}`,
        mode: "AMERICANO",
        variant: "CLASSIC",
        schedulingMode: "TARGET_GAMES",
        players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
        courts: 1,
        pointsPerMatch: 24,
        targetGamesPerPlayer: 1
      },
      `org_incomplete_${i}`
    );
    incompleteIds.push(t.id);
  }

  // Completed tournament should be evicted, incomplete ones should remain
  const completedAfter = getTournament(completedId);
  assert.equal(completedAfter, undefined, "Completed tournament should be evicted first");

  // At least the most recent incomplete tournament should still exist
  const lastIncomplete = getTournament(incompleteIds[incompleteIds.length - 1]);
  assert.ok(lastIncomplete, "Recent incomplete tournament should still exist");
});

// ============================================================================
// putTournament() Tests
// ============================================================================

test("putTournament stores tournament in memory", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_put");

  // Modify and put back
  tournament.config.name = "Modified Name";
  putTournament(tournament);

  const retrieved = getTournament(tournament.id);
  assert.equal(retrieved?.config.name, "Modified Name");
});

// ============================================================================
// deleteTournament() Tests
// ============================================================================

test("deleteTournament removes tournament from store", () => {
  const config: TournamentConfig = {
    name: "Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const tournament = createTournament(config, "org_delete");

  assert.ok(getTournament(tournament.id), "Tournament should exist before deletion");

  deleteTournament(tournament.id);

  assert.equal(getTournament(tournament.id), undefined, "Tournament should not exist after deletion");
});

test("deleteTournament throws error for non-existent tournament", () => {
  assert.throws(() => deleteTournament("nonexistent_id"), /Tournament not found/);
});
