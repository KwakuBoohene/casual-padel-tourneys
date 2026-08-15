import assert from "node:assert/strict";
import test from "node:test";

import {
  createTournamentSchema,
  isRegularScoreBody,
  submitScoreSchema
} from "../../src/schemas/tournament.ts";

const basePlayers = [
  { name: "A" },
  { name: "B" },
  { name: "C" },
  { name: "D" }
];

const americanoBase = {
  name: "Friday Social",
  mode: "AMERICANO" as const,
  variant: "CLASSIC" as const,
  schedulingMode: "TARGET_GAMES" as const,
  players: basePlayers,
  courts: 1,
  pointsPerMatch: 24,
  targetGamesPerPlayer: 4
};

test("createTournamentSchema defaults scoringMode to AMERICANO_POINTS", () => {
  const parsed = createTournamentSchema.parse(americanoBase);
  assert.equal(parsed.scoringMode, "AMERICANO_POINTS");
  assert.equal(parsed.pointsPerMatch, 24);
});

test("createTournamentSchema accepts Regular full-set win-by-2 + TB 7", () => {
  const parsed = createTournamentSchema.parse({
    name: "Sunday Mix",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `P${i + 1}` })),
    courts: 2,
    tournamentTimeMinutes: 90,
    scoringMode: "REGULAR",
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 2,
      setsToWin: 2,
      setTiebreakTo: 7,
      matchTiebreak: true
    }
  });
  assert.equal(parsed.scoringMode, "REGULAR");
  assert.equal(parsed.regularScoring?.setFormat, "FULL_SET");
  assert.equal(parsed.regularScoring?.setTiebreakTo, 7);
});

test("createTournamentSchema rejects Mexicano with fewer than 8 players", () => {
  const result = createTournamentSchema.safeParse({
    name: "Tiny Mexicano",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: basePlayers,
    courts: 1,
    pointsPerMatch: 24,
    tournamentTimeMinutes: 90
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues.map((i) => i.message).join(" "), /at least 8/i);
  }
});

test("createTournamentSchema rejects Regular without set format", () => {
  const result = createTournamentSchema.safeParse({
    name: "Sunday Mix",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: basePlayers,
    courts: 1,
    targetGamesPerPlayer: 4,
    scoringMode: "REGULAR"
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => issue.message).join(" ");
    assert.match(messages, /regularScoring|set format/i);
  }
});

test("createTournamentSchema rejects Americano points without pointsPerMatch", () => {
  const result = createTournamentSchema.safeParse({
    name: "Friday Social",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: basePlayers,
    courts: 1,
    targetGamesPerPlayer: 4,
    scoringMode: "AMERICANO_POINTS"
  });
  assert.equal(result.success, false);
});

test("createTournamentSchema rejects full-set win-by-2 without setTiebreakTo", () => {
  const result = createTournamentSchema.safeParse({
    name: "Sunday Mix",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: basePlayers,
    courts: 1,
    targetGamesPerPlayer: 4,
    scoringMode: "REGULAR",
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 2,
      setsToWin: 2
    }
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => issue.message).join(" ");
    assert.match(messages, /setTiebreakTo/i);
  }
});

test("submitScoreSchema accepts Americano points body", () => {
  const parsed = submitScoreSchema.parse({
    tournamentId: "t1",
    matchId: "m1",
    scoreA: 24,
    scoreB: 16,
    expectedVersion: 0
  });
  assert.equal(isRegularScoreBody(parsed), false);
  if (!isRegularScoreBody(parsed)) {
    assert.equal(parsed.scoreA, 24);
  }
});

test("submitScoreSchema accepts Regular DRAFT body", () => {
  const parsed = submitScoreSchema.parse({
    tournamentId: "t1",
    matchId: "m1",
    sets: [{ setNumber: 1, gamesA: 4, gamesB: 4 }],
    status: "DRAFT",
    expectedVersion: 2
  });
  assert.equal(isRegularScoreBody(parsed), true);
  if (isRegularScoreBody(parsed)) {
    assert.equal(parsed.status, "DRAFT");
    assert.equal(parsed.sets[0].gamesA, 4);
  }
});

test("submitScoreSchema rejects incomplete Regular body", () => {
  const result = submitScoreSchema.safeParse({
    tournamentId: "t1",
    matchId: "m1",
    sets: [{ setNumber: 1, gamesA: 1, gamesB: 0 }],
    expectedVersion: 0
  });
  assert.equal(result.success, false);
});
