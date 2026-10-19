import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOutstandingPlayerRows,
  isTournamentComplete
} from "../../app/tournament/[id]/components/outstandingPlayers";
import {
  isMatchComplete,
  isMatchResolved,
  isMatchVoided,
  matchHasProgress,
  type TournamentViewModel
} from "../../app/tournament/[id]/types";

type Match = TournamentViewModel["rounds"][number]["matches"][number];

const VOIDED_AT = "2026-08-19T18:00:00.000Z";

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: "m1",
    court: 1,
    teamA: ["a", "b"],
    teamB: ["c", "d"],
    completed: false,
    ...overrides
  };
}

function tournament(rounds: Match[][], overrides: Partial<TournamentViewModel> = {}): TournamentViewModel {
  return {
    id: "t1",
    updatedAt: new Date().toISOString(),
    config: { name: "Night", mode: "AMERICANO", variant: "CLASSIC" },
    players: [
      { id: "a", name: "Ana" },
      { id: "b", name: "Ben" },
      { id: "c", name: "Cam" },
      { id: "d", name: "Dee" }
    ],
    leaderboard: [
      { playerId: "a", name: "Ana", totalPoints: 0, gamesPlayed: 0, rank: 1 },
      { playerId: "b", name: "Ben", totalPoints: 0, gamesPlayed: 0, rank: 2 },
      { playerId: "c", name: "Cam", totalPoints: 0, gamesPlayed: 0, rank: 3 },
      { playerId: "d", name: "Dee", totalPoints: 0, gamesPlayed: 0, rank: 4 }
    ],
    rounds: rounds.map((matches, index) => ({
      id: `r${index + 1}`,
      roundNumber: index + 1,
      matches
    })),
    ...overrides
  };
}

test("void predicates treat absent and null voidedAt as not voided", () => {
  assert.equal(isMatchVoided(match()), false);
  assert.equal(isMatchVoided(match({ voidedAt: null })), false);
  assert.equal(isMatchVoided(match({ voidedAt: VOIDED_AT })), true);
});

test("a voided match is never complete, even with a partial score", () => {
  const voided = match({ voidedAt: VOIDED_AT, scoreA: 9, scoreB: 4 });
  assert.equal(isMatchComplete(voided), false);
  assert.equal(isMatchResolved(voided), true, "voided still counts as resolved");
});

test("a voided match reports no progress, so it cannot look live", () => {
  assert.equal(matchHasProgress(match({ voidedAt: VOIDED_AT, scoreA: 9, scoreB: 4 })), false);
  assert.equal(matchHasProgress(match({ scoreA: 9 })), true);
});

test("a closed event reads complete even with matches left unplayed", () => {
  const closed = tournament([[match({ id: "m1", voidedAt: VOIDED_AT })]], {
    endedAt: VOIDED_AT
  });
  assert.equal(isTournamentComplete(closed), true);
});

test("an event whose only incomplete matches are voided reads complete", () => {
  const board = tournament([
    [
      match({ id: "m1", completed: true, scoreA: 16, scoreB: 8 }),
      match({ id: "m2", voidedAt: VOIDED_AT })
    ]
  ]);
  assert.equal(isTournamentComplete(board), true);
});

test("an event with a genuinely unplayed match is still in progress", () => {
  const board = tournament([
    [match({ id: "m1", completed: true, scoreA: 16, scoreB: 8 }), match({ id: "m2" })]
  ]);
  assert.equal(isTournamentComplete(board), false);
});

test("a closed Mexicano night reads complete", () => {
  const board = tournament([[match({ id: "m1", voidedAt: VOIDED_AT })]], {
    config: { name: "Mx", mode: "MEXICANO", variant: "CLASSIC" },
    endedAt: VOIDED_AT
  });
  assert.equal(isTournamentComplete(board), true);
});

test("voided matches contribute nothing to Americano totals", () => {
  const board = tournament([
    [
      match({ id: "m1", completed: true, scoreA: 16, scoreB: 8 }),
      // Abandoned with a partial score entered — must not count for anybody.
      match({ id: "m2", teamA: ["a", "b"], teamB: ["c", "d"], scoreA: 9, scoreB: 4, voidedAt: VOIDED_AT })
    ]
  ]);

  const rows = buildOutstandingPlayerRows(board);
  const ana = rows.find((row) => row.playerId === "a")!;

  assert.equal(ana.wins, 1, "only the played match counts");
  assert.equal(ana.americanoPointsWon, 16);
  assert.equal(ana.americanoPointsLost, 8);
});

test("an all-voided round leaves every player on zero", () => {
  const board = tournament([[match({ id: "m1", voidedAt: VOIDED_AT, scoreA: 5, scoreB: 3 })]]);

  const rows = buildOutstandingPlayerRows(board);

  assert.equal(rows.length, 4);
  assert.ok(rows.every((row) => row.wins === 0 && row.losses === 0 && row.draws === 0));
  assert.ok(rows.every((row) => (row.americanoPointsWon ?? 0) === 0));
});
