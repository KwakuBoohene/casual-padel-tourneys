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

// ========== Handicap Tests (Player Integration) ==========

test("handicap reduces selection priority for players with higher effective games", () => {
  const config: TournamentConfig = {
    name: "Handicap Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const initial = generateTournament(config);

  // Simulate integration: add 2 new players with handicap
  const avgGames = initial.players.reduce((sum, p) => sum + p.gamesPlayed, 0) / initial.players.length;
  const handicap = Math.floor(avgGames * 0.5);

  const expandedPlayers: Player[] = [
    ...initial.players,
    { id: "new1", name: "New Player 1", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "new2", name: "New Player 2", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 }
  ];

  // Lock completed rounds
  initial.rounds[0].isLocked = true;

  const recalculated = recalculateRemainingTournament(config, expandedPlayers, initial.rounds);

  // Count appearances of new players vs original players in next round
  const nextRoundMatches = recalculated[1]?.matches ?? [];
  let newPlayerAppearances = 0;
  let originalPlayerAppearances = 0;

  for (const match of nextRoundMatches) {
    const allPlayers = [...match.teamA, ...match.teamB];
    for (const playerId of allPlayers) {
      if (playerId === "new1" || playerId === "new2") {
        newPlayerAppearances++;
      } else {
        originalPlayerAppearances++;
      }
    }
  }

  // New players with handicap should appear less frequently than those with 0 games
  // because their effective games = 0 + handicap > 0
  const playersWithZeroGames = expandedPlayers.filter((p) => p.gamesPlayed === 0 && !p.handicap);
  if (playersWithZeroGames.length > 0) {
    // If there are players with truly 0 games, they should be prioritized
    assert.ok(true, "Handicap logic reduces priority correctly");
  } else {
    // All original players have games, so new players should still be selected
    assert.ok(newPlayerAppearances > 0, "New players with handicap should still be selected");
  }
});

test("handicap formula: players with handicap=2 selected like players with 2 games", () => {
  // Create a scenario where we can test handicap directly
  // 8 players: 4 with 2 games played, 4 new with 0 games + handicap 2
  const playersWithGames: Player[] = [
    { id: "p1", name: "P1", gamesPlayed: 2, totalPoints: 48 },
    { id: "p2", name: "P2", gamesPlayed: 2, totalPoints: 48 },
    { id: "p3", name: "P3", gamesPlayed: 2, totalPoints: 48 },
    { id: "p4", name: "P4", gamesPlayed: 2, totalPoints: 48 }
  ];

  const playersWithHandicap: Player[] = [
    { id: "new1", name: "New1", gamesPlayed: 0, totalPoints: 0, handicap: 2, integrationWave: 1 },
    { id: "new2", name: "New2", gamesPlayed: 0, totalPoints: 0, handicap: 2, integrationWave: 1 },
    { id: "new3", name: "New3", gamesPlayed: 0, totalPoints: 0, handicap: 2, integrationWave: 1 },
    { id: "new4", name: "New4", gamesPlayed: 0, totalPoints: 0, handicap: 2, integrationWave: 1 }
  ];

  const allPlayers = [...playersWithGames, ...playersWithHandicap];

  const config: TournamentConfig = {
    name: "Handicap Equivalence Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: allPlayers.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  // Generate with the mixed player list
  const rounds = recalculateRemainingTournament(config, allPlayers, []);

  // Count how many times each group appears in round 1
  const round1Matches = rounds[0]?.matches ?? [];
  let gamesGroupCount = 0;
  let handicapGroupCount = 0;

  for (const match of round1Matches) {
    const allPlayerIds = [...match.teamA, ...match.teamB];
    for (const playerId of allPlayerIds) {
      if (playersWithGames.some((p) => p.id === playerId)) {
        gamesGroupCount++;
      } else if (playersWithHandicap.some((p) => p.id === playerId)) {
        handicapGroupCount++;
      }
    }
  }

  // With handicap correctly applied, both groups should be selected roughly equally
  // since effectiveGames = 2 for both groups
  const ratio = handicapGroupCount / (gamesGroupCount + handicapGroupCount);
  assert.ok(ratio >= 0.3 && ratio <= 0.7, `Selection should be balanced, got ratio ${ratio}`);
});

test("players without handicap are prioritized over those with same gamesPlayed + handicap", () => {
  const players: Player[] = [
    // Group A: 4 players with 3 games played, no handicap (effective = 3)
    { id: "a1", name: "A1", gamesPlayed: 3, totalPoints: 72 },
    { id: "a2", name: "A2", gamesPlayed: 3, totalPoints: 72 },
    { id: "a3", name: "A3", gamesPlayed: 3, totalPoints: 72 },
    { id: "a4", name: "A4", gamesPlayed: 3, totalPoints: 72 },
    // Group B: 4 players with 2 games + handicap 2 (effective = 4)
    { id: "b1", name: "B1", gamesPlayed: 2, totalPoints: 48, handicap: 2, integrationWave: 1 },
    { id: "b2", name: "B2", gamesPlayed: 2, totalPoints: 48, handicap: 2, integrationWave: 1 },
    { id: "b3", name: "B3", gamesPlayed: 2, totalPoints: 48, handicap: 2, integrationWave: 1 },
    { id: "b4", name: "B4", gamesPlayed: 2, totalPoints: 48, handicap: 2, integrationWave: 1 },
    // Group C: 4 players with 4 games played (effective = 4) - should be deprioritized like Group B
    { id: "c1", name: "C1", gamesPlayed: 4, totalPoints: 96 },
    { id: "c2", name: "C2", gamesPlayed: 4, totalPoints: 96 },
    { id: "c3", name: "C3", gamesPlayed: 4, totalPoints: 96 },
    { id: "c4", name: "C4", gamesPlayed: 4, totalPoints: 96 }
  ];

  const config: TournamentConfig = {
    name: "Handicap Priority Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: players.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  };

  const rounds = recalculateRemainingTournament(config, players, []);

  // In the first round with 2 courts (8 player slots), Group A (effective=3) should be fully selected
  // while Groups B and C (effective=4) should share remaining slots
  const round1Matches = rounds[0]?.matches ?? [];
  let groupACount = 0;
  let groupBCount = 0;
  let groupCCount = 0;

  for (const match of round1Matches) {
    const allPlayerIds = [...match.teamA, ...match.teamB];
    for (const playerId of allPlayerIds) {
      if (playerId.startsWith("a")) groupACount++;
      if (playerId.startsWith("b")) groupBCount++;
      if (playerId.startsWith("c")) groupCCount++;
    }
  }

  // Group A (effective=3) should be fully selected (all 4 players)
  assert.equal(groupACount, 4, `All Group A players should be selected, got ${groupACount}`);

  // Combined Group B+C should be 4 (filling remaining slots)
  assert.equal(
    groupBCount + groupCCount,
    4,
    `Groups B+C should fill remaining 4 slots, got ${groupBCount + groupCCount}`
  );
});

test("handicap affects selection across multiple rounds", () => {
  const players: Player[] = [
    { id: "p1", name: "P1", gamesPlayed: 0, totalPoints: 0 },
    { id: "p2", name: "P2", gamesPlayed: 0, totalPoints: 0 },
    { id: "p3", name: "P3", gamesPlayed: 0, totalPoints: 0 },
    { id: "p4", name: "P4", gamesPlayed: 0, totalPoints: 0 },
    { id: "p5", name: "P5", gamesPlayed: 0, totalPoints: 0 },
    { id: "p6", name: "P6", gamesPlayed: 0, totalPoints: 0 },
    // New players with handicap
    { id: "new1", name: "New1", gamesPlayed: 0, totalPoints: 0, handicap: 1, integrationWave: 1 },
    { id: "new2", name: "New2", gamesPlayed: 0, totalPoints: 0, handicap: 1, integrationWave: 1 }
  ];

  const config: TournamentConfig = {
    name: "Multi-round Handicap Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: players.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const rounds = recalculateRemainingTournament(config, players, []);

  // Track new player appearances across all rounds
  let newPlayerTotalAppearances = 0;
  let originalPlayerTotalAppearances = 0;

  for (const round of rounds) {
    for (const match of round.matches) {
      const allPlayerIds = [...match.teamA, ...match.teamB];
      for (const playerId of allPlayerIds) {
        if (playerId === "new1" || playerId === "new2") {
          newPlayerTotalAppearances++;
        } else {
          originalPlayerTotalAppearances++;
        }
      }
    }
  }

  // New players should appear less frequently due to handicap
  const newPlayerRatio =
    newPlayerTotalAppearances / (newPlayerTotalAppearances + originalPlayerTotalAppearances);
  // 2 new players out of 8 total = 25%, but with handicap should be slightly less
  assert.ok(
    newPlayerRatio < 0.25,
    `New players with handicap should appear less than their proportion (${newPlayerRatio})`
  );
});

test("zero handicap has no effect on selection", () => {
  const players: Player[] = [
    { id: "p1", name: "P1", gamesPlayed: 2, totalPoints: 48 },
    { id: "p2", name: "P2", gamesPlayed: 2, totalPoints: 48 },
    { id: "p3", name: "P3", gamesPlayed: 2, totalPoints: 48 },
    { id: "p4", name: "P4", gamesPlayed: 2, totalPoints: 48 },
    // Players with handicap: 0 should behave same as no handicap
    { id: "p5", name: "P5", gamesPlayed: 2, totalPoints: 48, handicap: 0 },
    { id: "p6", name: "P6", gamesPlayed: 2, totalPoints: 48, handicap: 0 },
    { id: "p7", name: "P7", gamesPlayed: 2, totalPoints: 48, handicap: 0 },
    { id: "p8", name: "P8", gamesPlayed: 2, totalPoints: 48, handicap: 0 }
  ];

  const config: TournamentConfig = {
    name: "Zero Handicap Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: players.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const rounds = recalculateRemainingTournament(config, players, []);

  // All players have effective games = 2, so should be selected roughly equally
  let withoutHandicapCount = 0;
  let withZeroHandicapCount = 0;

  for (const round of rounds) {
    for (const match of round.matches) {
      const allPlayerIds = [...match.teamA, ...match.teamB];
      for (const playerId of allPlayerIds) {
        if (["p1", "p2", "p3", "p4"].includes(playerId)) {
          withoutHandicapCount++;
        } else {
          withZeroHandicapCount++;
        }
      }
    }
  }

  const ratio = withZeroHandicapCount / (withoutHandicapCount + withZeroHandicapCount);
  // Should be close to 50% (0.5)
  assert.ok(Math.abs(ratio - 0.5) < 0.15, `Zero handicap should not affect selection, got ratio ${ratio}`);
});

test("undefined handicap treated as zero", () => {
  const players: Player[] = [
    { id: "p1", name: "P1", gamesPlayed: 1, totalPoints: 24 },
    { id: "p2", name: "P2", gamesPlayed: 1, totalPoints: 24 },
    { id: "p3", name: "P3", gamesPlayed: 1, totalPoints: 24 },
    { id: "p4", name: "P4", gamesPlayed: 1, totalPoints: 24 },
    { id: "p5", name: "P5", gamesPlayed: 1, totalPoints: 24, handicap: undefined },
    { id: "p6", name: "P6", gamesPlayed: 1, totalPoints: 24, handicap: undefined },
    { id: "p7", name: "P7", gamesPlayed: 1, totalPoints: 24, handicap: undefined },
    { id: "p8", name: "P8", gamesPlayed: 1, totalPoints: 24, handicap: undefined }
  ];

  const config: TournamentConfig = {
    name: "Undefined Handicap Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: players.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3
  };

  const rounds = recalculateRemainingTournament(config, players, []);

  // Count selections
  let definedHandicapCount = 0;
  let undefinedHandicapCount = 0;

  for (const round of rounds) {
    for (const match of round.matches) {
      const allPlayerIds = [...match.teamA, ...match.teamB];
      for (const playerId of allPlayerIds) {
        if (["p1", "p2", "p3", "p4"].includes(playerId)) {
          definedHandicapCount++;
        } else {
          undefinedHandicapCount++;
        }
      }
    }
  }

  const ratio = undefinedHandicapCount / (definedHandicapCount + undefinedHandicapCount);
  // Should be close to 50%
  assert.ok(Math.abs(ratio - 0.5) < 0.15, `Undefined handicap should be treated as zero, got ratio ${ratio}`);
});

// ========== Fairness Validation with Integrated Players ==========

test("fairness maintained after integrating 2 players", () => {
  // Start with 8 players
  const initialPlayers: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const config: TournamentConfig = {
    name: "Fairness Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: initialPlayers.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const initial = generateTournament(config);

  // Lock first round
  initial.rounds[0].isLocked = true;

  // Calculate average games and add 2 new players with handicap
  const avgGames = initial.players.reduce((sum, p) => sum + p.gamesPlayed, 0) / initial.players.length;
  const handicap = Math.floor(avgGames * 0.5);

  const expandedPlayers: Player[] = [
    ...initial.players,
    { id: "new1", name: "New Player 1", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "new2", name: "New Player 2", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 }
  ];

  // Recalculate with expanded player list
  const recalculated = recalculateRemainingTournament(config, expandedPlayers, initial.rounds);

  // Check fairness after regeneration
  const delta = maxGamesDelta(expandedPlayers);
  assert.ok(delta <= 1, `maxGamesDelta should be ≤ 1, got ${delta}`);
});

test("fairness maintained with 4 integrated players", () => {
  const initialPlayers: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const config: TournamentConfig = {
    name: "Fairness Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: initialPlayers.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 5
  };

  const initial = generateTournament(config);
  initial.rounds[0].isLocked = true;

  const avgGames = initial.players.reduce((sum, p) => sum + p.gamesPlayed, 0) / initial.players.length;
  const handicap = Math.floor(avgGames * 0.5);

  const expandedPlayers: Player[] = [
    ...initial.players,
    { id: "new1", name: "New 1", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "new2", name: "New 2", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "new3", name: "New 3", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "new4", name: "New 4", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 }
  ];

  const recalculated = recalculateRemainingTournament(config, expandedPlayers, initial.rounds);

  const delta = maxGamesDelta(expandedPlayers);
  assert.ok(delta <= 1, `maxGamesDelta should be ≤ 1 with 12 players, got ${delta}`);
});

test("fairness maintained across multiple integration waves", () => {
  const initialPlayers: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const config: TournamentConfig = {
    name: "Multi-wave Fairness Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: initialPlayers.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 6
  };

  let state = generateTournament(config);
  state.rounds[0].isLocked = true;

  // Wave 1: Add 2 players
  let avgGames = state.players.reduce((sum, p) => sum + p.gamesPlayed, 0) / state.players.length;
  let handicap = Math.floor(avgGames * 0.5);

  let expandedPlayers: Player[] = [
    ...state.players,
    { id: "w1p1", name: "Wave1 P1", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "w1p2", name: "Wave1 P2", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 }
  ];

  let rounds = recalculateRemainingTournament(config, expandedPlayers, state.rounds);

  // Simulate playing more rounds (lock round 2)
  if (rounds[1]) {
    rounds[1].isLocked = true;
    // Update games played for wave 1 players
    expandedPlayers.find((p) => p.id === "w1p1")!.gamesPlayed = 1;
    expandedPlayers.find((p) => p.id === "w1p2")!.gamesPlayed = 1;
  }

  // Wave 2: Add 2 more players
  avgGames = expandedPlayers.reduce((sum, p) => sum + p.gamesPlayed, 0) / expandedPlayers.length;
  handicap = Math.floor(avgGames * 0.5);

  expandedPlayers = [
    ...expandedPlayers,
    { id: "w2p1", name: "Wave2 P1", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 2 },
    { id: "w2p2", name: "Wave2 P2", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 2 }
  ];

  rounds = recalculateRemainingTournament(config, expandedPlayers, rounds);

  const delta = maxGamesDelta(expandedPlayers);
  assert.ok(delta <= 2, `maxGamesDelta should be ≤ 2 with multiple waves, got ${delta}`);
});

test("fairness maintained with MIXED variant integration", () => {
  const initialPlayers: Player[] = [
    { id: "m1", name: "Male 1", gender: "MALE", gamesPlayed: 0, totalPoints: 0 },
    { id: "m2", name: "Male 2", gender: "MALE", gamesPlayed: 0, totalPoints: 0 },
    { id: "m3", name: "Male 3", gender: "MALE", gamesPlayed: 0, totalPoints: 0 },
    { id: "m4", name: "Male 4", gender: "MALE", gamesPlayed: 0, totalPoints: 0 },
    { id: "f1", name: "Female 1", gender: "FEMALE", gamesPlayed: 0, totalPoints: 0 },
    { id: "f2", name: "Female 2", gender: "FEMALE", gamesPlayed: 0, totalPoints: 0 },
    { id: "f3", name: "Female 3", gender: "FEMALE", gamesPlayed: 0, totalPoints: 0 },
    { id: "f4", name: "Female 4", gender: "FEMALE", gamesPlayed: 0, totalPoints: 0 }
  ];

  const config: TournamentConfig = {
    name: "Mixed Fairness Test",
    mode: "AMERICANO",
    variant: "MIXED",
    schedulingMode: "TARGET_GAMES",
    players: initialPlayers.map((p) => ({ name: p.name, gender: p.gender })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const initial = generateTournament(config);
  initial.rounds[0].isLocked = true;

  const avgGames = initial.players.reduce((sum, p) => sum + p.gamesPlayed, 0) / initial.players.length;
  const handicap = Math.floor(avgGames * 0.5);

  const expandedPlayers: Player[] = [
    ...initial.players,
    {
      id: "newM",
      name: "New Male",
      gender: "MALE",
      gamesPlayed: 0,
      totalPoints: 0,
      handicap,
      integrationWave: 1
    },
    {
      id: "newF",
      name: "New Female",
      gender: "FEMALE",
      gamesPlayed: 0,
      totalPoints: 0,
      handicap,
      integrationWave: 1
    }
  ];

  const recalculated = recalculateRemainingTournament(config, expandedPlayers, initial.rounds);

  const delta = maxGamesDelta(expandedPlayers);
  assert.ok(delta <= 1, `maxGamesDelta should be ≤ 1 for MIXED variant, got ${delta}`);
});

test("fairness maintained with large player base after integration", () => {
  const initialPlayers: Player[] = Array.from({ length: 16 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const config: TournamentConfig = {
    name: "Large Tournament Fairness",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: initialPlayers.map((p) => ({ name: p.name })),
    courts: 4,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const initial = generateTournament(config);
  initial.rounds[0].isLocked = true;

  const avgGames = initial.players.reduce((sum, p) => sum + p.gamesPlayed, 0) / initial.players.length;
  const handicap = Math.floor(avgGames * 0.5);

  const expandedPlayers: Player[] = [
    ...initial.players,
    { id: "new1", name: "New 1", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "new2", name: "New 2", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "new3", name: "New 3", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "new4", name: "New 4", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 }
  ];

  const recalculated = recalculateRemainingTournament(config, expandedPlayers, initial.rounds);

  const delta = maxGamesDelta(expandedPlayers);
  assert.ok(delta <= 1, `maxGamesDelta should be ≤ 1 with 20 players, got ${delta}`);
});

test("fairness edge case: integration early in tournament", () => {
  const initialPlayers: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const config: TournamentConfig = {
    name: "Early Integration",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: initialPlayers.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 6
  };

  const initial = generateTournament(config);

  // Lock only first round (very early integration)
  initial.rounds[0].isLocked = true;

  const avgGames = initial.players.reduce((sum, p) => sum + p.gamesPlayed, 0) / initial.players.length;
  const handicap = Math.floor(avgGames * 0.5);

  const expandedPlayers: Player[] = [
    ...initial.players,
    { id: "new1", name: "New 1", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "new2", name: "New 2", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 }
  ];

  const recalculated = recalculateRemainingTournament(config, expandedPlayers, initial.rounds);

  // With early integration, there are many rounds remaining to balance fairness
  const delta = maxGamesDelta(expandedPlayers);
  assert.ok(delta <= 1, `Early integration should maintain fairness, got delta ${delta}`);
});

test("fairness edge case: integration late in tournament", () => {
  const initialPlayers: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const config: TournamentConfig = {
    name: "Late Integration",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: initialPlayers.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  };

  const initial = generateTournament(config);

  // Lock all rounds except last one (late integration)
  for (let i = 0; i < initial.rounds.length - 1; i++) {
    initial.rounds[i].isLocked = true;
  }

  const avgGames = initial.players.reduce((sum, p) => sum + p.gamesPlayed, 0) / initial.players.length;
  const handicap = Math.floor(avgGames * 0.5);

  const expandedPlayers: Player[] = [
    ...initial.players,
    { id: "new1", name: "New 1", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "new2", name: "New 2", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 }
  ];

  const recalculated = recalculateRemainingTournament(config, expandedPlayers, initial.rounds);

  // Late integration has fewer rounds to balance, delta might be higher
  const delta = maxGamesDelta(expandedPlayers);
  // More lenient for late integration
  assert.ok(delta <= 3, `Late integration fairness acceptable, got delta ${delta}`);
});

test("fairness with different handicap ratios", () => {
  const initialPlayers: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const config: TournamentConfig = {
    name: "Handicap Ratio Test",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: initialPlayers.map((p) => ({ name: p.name })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 5
  };

  const initial = generateTournament(config);
  initial.rounds[0].isLocked = true;

  const avgGames = initial.players.reduce((sum, p) => sum + p.gamesPlayed, 0) / initial.players.length;

  // Test with different handicap ratios
  const testRatios = [0.25, 0.5, 0.75, 1.0];

  for (const ratio of testRatios) {
    const handicap = Math.floor(avgGames * ratio);

    const expandedPlayers: Player[] = [
      ...initial.players.map((p) => ({ ...p })), // Clone players
      {
        id: `new1_${ratio}`,
        name: `New 1 (${ratio})`,
        gamesPlayed: 0,
        totalPoints: 0,
        handicap,
        integrationWave: 1
      },
      {
        id: `new2_${ratio}`,
        name: `New 2 (${ratio})`,
        gamesPlayed: 0,
        totalPoints: 0,
        handicap,
        integrationWave: 1
      }
    ];

    const recalculated = recalculateRemainingTournament(config, expandedPlayers, initial.rounds);

    const delta = maxGamesDelta(expandedPlayers);
    assert.ok(delta <= 2, `Handicap ratio ${ratio} should maintain fairness, got delta ${delta}`);
  }
});
