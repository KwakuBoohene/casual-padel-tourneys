import test from "node:test";
import assert from "node:assert/strict";

import { maxGamesDelta } from "./fairnessEvaluator.js";
import { generateTournament } from "./americanoScheduler.js";

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
