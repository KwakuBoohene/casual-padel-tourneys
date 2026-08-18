import test from "node:test";
import assert from "node:assert/strict";

import { computeEstimate } from "../../../src/utilities/organizer/estimateHelpers";

test("computeEstimate Regular uses setsToWin × 12 minutes", () => {
  const result = computeEstimate({
    courtsText: "2",
    pointsText: "24",
    mode: "AMERICANO",
    schedulingMode: "TARGET_GAMES",
    targetGamesText: "3",
    tournamentTimeText: "90",
    playersCount: 8,
    scoringMode: "REGULAR",
    regularSetsToWin: 2
  });
  assert.ok(result);
  assert.equal(result.rounds, 3);
  assert.equal(result.durationMinutes, 72);
});

test("computeEstimate round robin counts matchups, not players", () => {
  const classic = computeEstimate({
    courtsText: "2",
    pointsText: "24",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "ROUND_ROBIN",
    targetGamesText: "4",
    tournamentTimeText: "90",
    playersCount: 8,
    scoringMode: "AMERICANO_POINTS"
  });
  // C(8,2) = 28 partnerships, two per match => 14 matches over 2 courts = 7 rounds.
  assert.ok(classic);
  assert.equal(classic.rounds, 7);
  assert.equal(classic.gamesPerPlayer, 7);

  const team = computeEstimate({
    courtsText: "2",
    pointsText: "24",
    mode: "AMERICANO",
    variant: "TEAM",
    schedulingMode: "ROUND_ROBIN",
    targetGamesText: "4",
    tournamentTimeText: "90",
    playersCount: 16,
    scoringMode: "AMERICANO_POINTS"
  });
  // 8 teams => C(8,2) = 28 matchups over 2 courts = 14 rounds.
  assert.ok(team);
  assert.equal(team.rounds, 14);
  assert.equal(team.gamesPerPlayer, 7);
});

test("computeEstimate round robin stretches when courts are scarce", () => {
  const base = {
    pointsText: "24",
    mode: "AMERICANO" as const,
    variant: "TEAM" as const,
    schedulingMode: "ROUND_ROBIN" as const,
    targetGamesText: "4",
    tournamentTimeText: "90",
    playersCount: 16,
    scoringMode: "AMERICANO_POINTS" as const
  };
  assert.equal(computeEstimate({ ...base, courtsText: "4" })?.rounds, 7);
  assert.equal(computeEstimate({ ...base, courtsText: "2" })?.rounds, 14);
  assert.equal(computeEstimate({ ...base, courtsText: "1" })?.rounds, 28);
});

test("computeEstimate Americano still uses pointsPerMatch × 35/60", () => {
  const result = computeEstimate({
    courtsText: "2",
    pointsText: "24",
    mode: "AMERICANO",
    schedulingMode: "TARGET_GAMES",
    targetGamesText: "3",
    tournamentTimeText: "90",
    playersCount: 8,
    scoringMode: "AMERICANO_POINTS"
  });
  assert.ok(result);
  assert.equal(result.rounds, 3);
  assert.equal(result.durationMinutes, 42);
});
