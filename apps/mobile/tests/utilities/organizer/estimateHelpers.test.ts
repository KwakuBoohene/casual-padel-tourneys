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
