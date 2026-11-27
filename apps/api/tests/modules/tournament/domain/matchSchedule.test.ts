import assert from "node:assert/strict";
import test from "node:test";

import { buildMatchSchedule, matchTargetLabel } from "../../../../src/modules/tournament/domain/matchSchedule.js";
import type { TournamentState } from "../../../../src/types/state.js";

const players = ["Ana", "Ben", "Cam", "Dee", "Eve", "Fay"].map((name, i) => ({
  id: `p${i}`,
  name,
  gamesPlayed: 0,
  totalPoints: 0
}));

function state(overrides: Partial<TournamentState> = {}): TournamentState {
  return {
    id: "t1",
    config: {
      name: "Monday Americano",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [],
      courts: 1,
      pointsPerMatch: 24
    },
    players,
    rounds: [
      {
        id: "r2",
        roundNumber: 2,
        isLocked: false,
        matches: [{ id: "m2", round: 2, court: 1, teamA: ["p2", "p3"], teamB: ["p4", "p5"], completed: false }]
      },
      {
        id: "r1",
        roundNumber: 1,
        isLocked: true,
        matches: [
          { id: "m1", round: 1, court: 1, teamA: ["p0", "p1"], teamB: ["p2", "p3"], completed: true, scoreA: 15, scoreB: 9 }
        ]
      }
    ],
    version: 1,
    leaderboard: [],
    publicToken: "pub",
    createdAt: "2026-11-27T18:30:00.000Z",
    updatedAt: "2026-11-27T20:00:00.000Z",
    pendingPlayers: [],
    ...overrides
  } as TournamentState;
}

test("rounds come out in order with names, courts and who sits out", () => {
  const schedule = buildMatchSchedule(state());
  assert.deepEqual(schedule.rounds.map((round) => round.roundNumber), [1, 2]);
  const [first] = schedule.rounds;
  assert.deepEqual(first.courts[0], {
    label: "COURT 1",
    teamA: ["Ana", "Ben"],
    teamB: ["Cam", "Dee"],
    result: { kind: "points", a: "15", b: "9" }
  });
  assert.deepEqual(first.sittingOut, ["Eve", "Fay"]);
  assert.deepEqual(schedule.rounds[1].courts[0].result, { kind: "blank" });
});

test("header carries the date, format facts and match target", () => {
  const schedule = buildMatchSchedule(state());
  assert.equal(schedule.title, "Monday Americano");
  assert.equal(schedule.dateLabel, "Friday, 27 November 2026");
  assert.equal(schedule.shortDateLabel, "27 Nov 2026");
  assert.equal(schedule.matchTarget, "First to 24");
  assert.deepEqual(schedule.facts, [
    { label: "Format", value: "Classic Americano" },
    { label: "Players", value: "6" },
    { label: "Courts", value: "1" },
    { label: "Rounds", value: "2" },
    { label: "Each match", value: "First to 24" }
  ]);
});

test("a voided match prints Void rather than its partial score", () => {
  const base = state();
  base.rounds[0].matches[0] = { ...base.rounds[0].matches[0], scoreA: 3, scoreB: 1, voidedAt: "2026-11-27T21:00:00.000Z" };
  const round2 = buildMatchSchedule(base).rounds[1];
  assert.deepEqual(round2.courts[0].result, { kind: "text", value: "Void" });
});

test("regular scoring labels the target by set format", () => {
  const base = state().config;
  assert.equal(
    matchTargetLabel({ ...base, scoringMode: "REGULAR", regularScoring: { setFormat: "BO3_GAMES", gameWinBy: 1, setsToWin: 1 } }),
    "Best of 3 games"
  );
  assert.equal(
    matchTargetLabel({ ...base, scoringMode: "REGULAR", regularScoring: { setFormat: "FULL_SET", gameWinBy: 2, setsToWin: 1 } }),
    "Full set"
  );
});

test("a tournament with no rounds yields an empty schedule", () => {
  const schedule = buildMatchSchedule(state({ rounds: [] }));
  assert.equal(schedule.rounds.length, 0);
  assert.equal(schedule.facts[3].value, "0");
});
