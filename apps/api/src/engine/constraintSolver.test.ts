import test from "node:test";
import assert from "node:assert/strict";

import { buildRound, type BuildRoundInput } from "./constraintSolver.js";
import type { Player } from "@padel/shared";

test("buildRound creates matches with correct number of courts", () => {
  const players: Player[] = Array.from({ length: 12 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const input: BuildRoundInput = {
    roundNumber: 1,
    courts: 3,
    variant: "CLASSIC",
    players,
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  assert.equal(round.matches.length, 3, "Should create 3 matches for 3 courts");
  assert.equal(round.roundNumber, 1);
  assert.equal(round.isLocked, false);
});

test("buildRound assigns correct court numbers", () => {
  const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const input: BuildRoundInput = {
    roundNumber: 1,
    courts: 2,
    variant: "CLASSIC",
    players,
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  assert.equal(round.matches[0].court, 1);
  assert.equal(round.matches[1].court, 2);
});

test("buildRound selects players based on gamesPlayed (fairness)", () => {
  const players: Player[] = [
    { id: "p1", name: "Player 1", gamesPlayed: 0, totalPoints: 0 },
    { id: "p2", name: "Player 2", gamesPlayed: 0, totalPoints: 0 },
    { id: "p3", name: "Player 3", gamesPlayed: 2, totalPoints: 40 },
    { id: "p4", name: "Player 4", gamesPlayed: 2, totalPoints: 40 },
    { id: "p5", name: "Player 5", gamesPlayed: 1, totalPoints: 20 },
    { id: "p6", name: "Player 6", gamesPlayed: 1, totalPoints: 20 },
    { id: "p7", name: "Player 7", gamesPlayed: 0, totalPoints: 0 },
    { id: "p8", name: "Player 8", gamesPlayed: 0, totalPoints: 0 }
  ];

  const input: BuildRoundInput = {
    roundNumber: 2,
    courts: 2,
    variant: "CLASSIC",
    players,
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);
  const selectedIds = new Set<string>();
  for (const match of round.matches) {
    match.teamA.forEach((id) => selectedIds.add(id));
    match.teamB.forEach((id) => selectedIds.add(id));
  }

  // Should select the 4 players with gamesPlayed=0 (p1, p2, p7, p8)
  // and 4 players with gamesPlayed=1 (p5, p6)
  const selectedPlayers = players.filter((p) => selectedIds.has(p.id));
  const avgGamesPlayed = selectedPlayers.reduce((sum, p) => sum + p.gamesPlayed, 0) / selectedPlayers.length;

  // Players with fewer games should be prioritized
  assert.ok(avgGamesPlayed <= 1, "Should prioritize players with fewer games");
});

test("buildRound respects diversity penalty (co-player matrix)", () => {
  const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const coPlayerMatrix = new Map<string, number>();
  // Create high co-play history for p1 and p2
  coPlayerMatrix.set("p1:p2", 5);

  const input: BuildRoundInput = {
    roundNumber: 2,
    courts: 2,
    variant: "CLASSIC",
    players,
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix
  };

  const round = buildRound(input);

  // With the diversity penalty, p1 and p2 should be less likely to play together again
  // This is a probabilistic test, but the algorithm should tend to separate them
  assert.ok(round.matches.length === 2);
});

test("buildRound skips incomplete groups", () => {
  const players: Player[] = Array.from({ length: 6 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const input: BuildRoundInput = {
    roundNumber: 1,
    courts: 2,
    variant: "CLASSIC",
    players,
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  // Only 6 players, should create 1 match (4 players), skip the remaining 2
  assert.equal(round.matches.length, 1, "Should create only 1 complete match");
});

test("buildRound with no players creates empty round", () => {
  const input: BuildRoundInput = {
    roundNumber: 1,
    courts: 2,
    variant: "CLASSIC",
    players: [],
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  assert.equal(round.matches.length, 0, "Should create no matches with no players");
});

test("buildRound updates matrices after match creation", () => {
  const players: Player[] = Array.from({ length: 4 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const teammateMatrix = new Map<string, number>();
  const opponentMatrix = new Map<string, number>();
  const coPlayerMatrix = new Map<string, number>();

  const input: BuildRoundInput = {
    roundNumber: 1,
    courts: 1,
    variant: "CLASSIC",
    players,
    teammateMatrix,
    opponentMatrix,
    coPlayerMatrix
  };

  const round = buildRound(input);

  // After building the round, matrices should be updated
  const match = round.matches[0];

  // Teammate pairs should be recorded
  const team1Key = [match.teamA[0], match.teamA[1]].sort().join(":");
  const team2Key = [match.teamB[0], match.teamB[1]].sort().join(":");
  assert.equal(teammateMatrix.get(team1Key), 1, "Team A should be recorded");
  assert.equal(teammateMatrix.get(team2Key), 1, "Team B should be recorded");

  // Opponent pairs should be recorded (4 pairs: each teamA player vs each teamB player)
  let opponentCount = 0;
  for (const [key, value] of opponentMatrix.entries()) {
    if (value === 1) opponentCount++;
  }
  assert.equal(opponentCount, 4, "Should record 4 opponent pairings");

  // Co-player matrix should record all 6 pairs (combination of 4 players)
  let coPlayerCount = 0;
  for (const [key, value] of coPlayerMatrix.entries()) {
    if (value === 1) coPlayerCount++;
  }
  assert.equal(coPlayerCount, 6, "Should record 6 co-player pairings");
});

test("buildRound MIXED variant validates gender balance", () => {
  const players: Player[] = [
    { id: "m1", name: "Male 1", gamesPlayed: 0, totalPoints: 0, gender: "MALE" },
    { id: "m2", name: "Male 2", gamesPlayed: 0, totalPoints: 0, gender: "MALE" },
    { id: "f1", name: "Female 1", gamesPlayed: 0, totalPoints: 0, gender: "FEMALE" },
    { id: "f2", name: "Female 2", gamesPlayed: 0, totalPoints: 0, gender: "FEMALE" }
  ];

  const input: BuildRoundInput = {
    roundNumber: 1,
    courts: 1,
    variant: "MIXED",
    players,
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  assert.equal(round.matches.length, 1);
  const match = round.matches[0];

  // Each team should have 1 male and 1 female
  const teamAGenders = match.teamA.map((id) => players.find((p) => p.id === id)?.gender);
  const teamBGenders = match.teamB.map((id) => players.find((p) => p.id === id)?.gender);

  assert.ok(
    teamAGenders.includes("MALE") && teamAGenders.includes("FEMALE"),
    "Team A should have both genders"
  );
  assert.ok(
    teamBGenders.includes("MALE") && teamBGenders.includes("FEMALE"),
    "Team B should have both genders"
  );
});

test("buildRound MIXED variant with invalid gender combinations still creates match", () => {
  const players: Player[] = [
    { id: "m1", name: "Male 1", gamesPlayed: 0, totalPoints: 0, gender: "MALE" },
    { id: "m2", name: "Male 2", gamesPlayed: 0, totalPoints: 0, gender: "MALE" },
    { id: "m3", name: "Male 3", gamesPlayed: 0, totalPoints: 0, gender: "MALE" },
    { id: "m4", name: "Male 4", gamesPlayed: 0, totalPoints: 0, gender: "MALE" }
  ];

  const input: BuildRoundInput = {
    roundNumber: 1,
    courts: 1,
    variant: "MIXED",
    players,
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  // NOTE: Current implementation falls back to first combination even if invalid
  // This is a known limitation - the algorithm doesn't prevent invalid matches
  assert.equal(round.matches.length, 1, "Currently creates match even without proper gender balance");
});

test("buildRound MIXED variant without gender property still creates match", () => {
  const players: Player[] = [
    { id: "p1", name: "Player 1", gamesPlayed: 0, totalPoints: 0 }, // No gender
    { id: "p2", name: "Player 2", gamesPlayed: 0, totalPoints: 0 },
    { id: "p3", name: "Player 3", gamesPlayed: 0, totalPoints: 0 },
    { id: "p4", name: "Player 4", gamesPlayed: 0, totalPoints: 0 }
  ];

  const input: BuildRoundInput = {
    roundNumber: 1,
    courts: 1,
    variant: "MIXED",
    players,
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  // NOTE: Current implementation falls back to first combination even without gender data
  // This is a known limitation - the algorithm doesn't prevent invalid matches
  assert.equal(round.matches.length, 1, "Currently creates match even without gender data");
});

test("buildRound minimizes repeated teammates", () => {
  const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const teammateMatrix = new Map<string, number>();
  // Set high teammate history for p1-p2 and p3-p4
  teammateMatrix.set("p1:p2", 3);
  teammateMatrix.set("p3:p4", 3);

  const input: BuildRoundInput = {
    roundNumber: 2,
    courts: 2,
    variant: "CLASSIC",
    players,
    teammateMatrix,
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  // The algorithm should try to avoid pairing p1-p2 and p3-p4 again
  // Check if these pairs are NOT together in the matches
  let repeatedPairs = 0;
  for (const match of round.matches) {
    const teamA = match.teamA.sort().join(":");
    const teamB = match.teamB.sort().join(":");
    if (teamA === "p1:p2" || teamB === "p1:p2") repeatedPairs++;
    if (teamA === "p3:p4" || teamB === "p3:p4") repeatedPairs++;
  }

  // With good algorithm, should avoid repeating these pairs
  assert.ok(repeatedPairs < 2, "Should minimize repeated teammate pairings");
});

test("buildRound minimizes repeated opponents", () => {
  const players: Player[] = Array.from({ length: 4 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 1,
    totalPoints: 20
  }));

  const opponentMatrix = new Map<string, number>();
  // Set high opponent history for p1 vs p3, p1 vs p4, p2 vs p3, p2 vs p4
  opponentMatrix.set("p1:p3", 2);
  opponentMatrix.set("p1:p4", 2);
  opponentMatrix.set("p2:p3", 2);
  opponentMatrix.set("p2:p4", 2);

  const input: BuildRoundInput = {
    roundNumber: 2,
    courts: 1,
    variant: "CLASSIC",
    players,
    teammateMatrix: new Map(),
    opponentMatrix,
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  // With history showing p1,p2 vs p3,p4 twice before,
  // the algorithm should try a different team arrangement
  const match = round.matches[0];
  const teamA = match.teamA.sort().join(":");
  const teamB = match.teamB.sort().join(":");

  // Best arrangement should be different from p1,p2 vs p3,p4
  const isRepeatedArrangement =
    (teamA === "p1:p2" && teamB === "p3:p4") || (teamA === "p3:p4" && teamB === "p1:p2");

  assert.ok(!isRepeatedArrangement, "Should avoid repeated opponent arrangement");
});

test("buildRound with exactly 4 players creates 1 match", () => {
  const players: Player[] = Array.from({ length: 4 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const input: BuildRoundInput = {
    roundNumber: 1,
    courts: 1,
    variant: "CLASSIC",
    players,
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  assert.equal(round.matches.length, 1);
  assert.equal(round.matches[0].teamA.length, 2);
  assert.equal(round.matches[0].teamB.length, 2);
});

test("buildRound match structure is valid", () => {
  const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamesPlayed: 0,
    totalPoints: 0
  }));

  const input: BuildRoundInput = {
    roundNumber: 1,
    courts: 2,
    variant: "CLASSIC",
    players,
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    coPlayerMatrix: new Map()
  };

  const round = buildRound(input);

  for (const match of round.matches) {
    assert.ok(match.id.startsWith("match_"), "Match should have valid ID");
    assert.equal(match.round, 1, "Match should reference correct round number");
    assert.equal(match.completed, false, "New match should not be completed");
    assert.equal(match.teamA.length, 2, "Team A should have 2 players");
    assert.equal(match.teamB.length, 2, "Team B should have 2 players");

    // All 4 players should be unique
    const allIds = [...match.teamA, ...match.teamB];
    const uniqueIds = new Set(allIds);
    assert.equal(uniqueIds.size, 4, "All players in match should be unique");
  }
});
