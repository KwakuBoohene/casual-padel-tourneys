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

test("createTournamentSchema defaults contributeToCareerLeaderboard to true", () => {
  const parsed = createTournamentSchema.parse(americanoBase);
  assert.equal(parsed.contributeToCareerLeaderboard, true);
});

test("createTournamentSchema accepts contributeToCareerLeaderboard false", () => {
  const parsed = createTournamentSchema.parse({
    ...americanoBase,
    contributeToCareerLeaderboard: false
  });
  assert.equal(parsed.contributeToCareerLeaderboard, false);
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

test("createTournamentSchema accepts Mexicano without tournament time", () => {
  const parsed = createTournamentSchema.parse({
    name: "Open Mexicano",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `P${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24
  });
  assert.equal(parsed.mode, "MEXICANO");
  assert.equal(parsed.tournamentTimeMinutes, undefined);
});

test("createTournamentSchema rejects Mexicano with fewer than 8 players", () => {
  const result = createTournamentSchema.safeParse({
    name: "Tiny Mexicano",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: basePlayers,
    courts: 1,
    pointsPerMatch: 24
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues.map((i) => i.message).join(" "), /at least 8/i);
  }
});

test("createTournamentSchema accepts Team Americano with two fixed pairs", () => {
  const teams = [
    { playerA: { name: "A1" }, playerB: { name: "A2" } },
    { playerA: { name: "B1" }, playerB: { name: "B2" } }
  ];
  const parsed = createTournamentSchema.parse({
    name: "Team Am",
    mode: "AMERICANO",
    variant: "TEAM",
    schedulingMode: "TARGET_GAMES",
    players: [],
    teams,
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  });
  assert.equal(parsed.variant, "TEAM");
  assert.equal(parsed.teams?.length, 2);
});

test("createTournamentSchema rejects Team Americano with one pair", () => {
  const result = createTournamentSchema.safeParse({
    name: "Tiny Team Am",
    mode: "AMERICANO",
    variant: "TEAM",
    schedulingMode: "TARGET_GAMES",
    players: [],
    teams: [{ playerA: { name: "A1" }, playerB: { name: "A2" } }],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues.map((i) => i.message).join(" "), /Team Americano/i);
  }
});

test("createTournamentSchema rejects teams when variant is not TEAM", () => {
  const result = createTournamentSchema.safeParse({
    name: "Classic with teams",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: basePlayers,
    teams: [
      { playerA: { name: "A1" }, playerB: { name: "A2" } },
      { playerA: { name: "B1" }, playerB: { name: "B2" } }
    ],
    courts: 1,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 2
  });
  assert.equal(result.success, false);
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

test("createTournamentSchema defaults setTiebreakTo for a full set won by two", () => {
  const parsed = createTournamentSchema.parse({
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
  assert.equal(parsed.regularScoring?.setTiebreakTo, 7);
});

test("createTournamentSchema rejects setsToWin above best-of-7 max", () => {
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
      gameWinBy: 1,
      setsToWin: 5
    }
  });
  assert.equal(result.success, false);
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

test("regularScoringSchema accepts GOLDEN + gameWinBy 1", () => {
  const parsed = createTournamentSchema.parse({
    ...americanoBase,
    scoringMode: "REGULAR",
    pointsPerMatch: undefined,
    regularScoring: {
      setFormat: "BO3_GAMES",
      gameWinBy: 1,
      deuceMode: "GOLDEN",
      setsToWin: 1
    }
  });
  assert.equal(parsed.regularScoring?.deuceMode, "GOLDEN");
  assert.equal(parsed.regularScoring?.gameWinBy, 1);
});

test("deuce mode does not constrain the set margin", () => {
  // Deuce decides points inside a game; the margin decides games inside a set.
  const golden = createTournamentSchema.parse({
    ...americanoBase,
    scoringMode: "REGULAR",
    pointsPerMatch: undefined,
    regularScoring: {
      setFormat: "FULL_SET",
      deuceMode: "GOLDEN",
      setsToWin: 1
    }
  });
  assert.equal(golden.regularScoring?.gameWinBy, 2);

  const advantage = createTournamentSchema.parse({
    ...americanoBase,
    scoringMode: "REGULAR",
    pointsPerMatch: undefined,
    regularScoring: {
      setFormat: "BO3_GAMES",
      deuceMode: "ADVANTAGE",
      setsToWin: 1
    }
  });
  assert.equal(advantage.regularScoring?.gameWinBy, 1);
});

test("gameWinBy defaults from the set format when the client omits it", () => {
  const parse = (setFormat: string) =>
    createTournamentSchema.parse({
      ...americanoBase,
      scoringMode: "REGULAR",
      pointsPerMatch: undefined,
      regularScoring: { setFormat, setsToWin: 1 }
    }).regularScoring;

  assert.equal(parse("BO3_GAMES")?.gameWinBy, 1);
  assert.equal(parse("BO5_GAMES")?.gameWinBy, 1);
  assert.equal(parse("FULL_SET")?.gameWinBy, 2);
  assert.equal(parse("FULL_SET")?.setTiebreakTo, 7);
});

test("an explicit gameWinBy still overrides the format default", () => {
  const parsed = createTournamentSchema.parse({
    ...americanoBase,
    scoringMode: "REGULAR",
    pointsPerMatch: undefined,
    regularScoring: {
      setFormat: "BO5_GAMES",
      gameWinBy: 2,
      setsToWin: 1
    }
  });
  assert.equal(parsed.regularScoring?.gameWinBy, 2);
});

test("regularScoringSchema omits deuceMode when client does not send it", () => {
  const parsed = createTournamentSchema.parse({
    ...americanoBase,
    scoringMode: "REGULAR",
    pointsPerMatch: undefined,
    regularScoring: {
      setFormat: "FULL_SET",
      gameWinBy: 2,
      setsToWin: 1,
      setTiebreakTo: 7
    }
  });
  assert.equal(parsed.regularScoring?.deuceMode, undefined);
});

test("submitScoreSchema accepts Regular COMPLETE with win methods", () => {
  const parsed = submitScoreSchema.parse({
    tournamentId: "t1",
    matchId: "m1",
    sets: [
      {
        setNumber: 1,
        gamesA: 6,
        gamesB: 4,
        winMethodsA: ["REGULAR", "GOLDEN", "REGULAR", "STAR", "REGULAR", "REGULAR"],
        winMethodsB: ["REGULAR", "REGULAR", "REGULAR", "REGULAR"]
      }
    ],
    status: "COMPLETE",
    expectedVersion: 0
  });
  assert.equal(isRegularScoreBody(parsed), true);
  if (isRegularScoreBody(parsed)) {
    assert.equal(parsed.sets[0].winMethodsA?.[1], "GOLDEN");
  }
});
