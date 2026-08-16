import assert from "node:assert/strict";
import test from "node:test";

import { isTournamentComplete } from "../../app/tournament/[id]/components/outstandingPlayers";
import type { TournamentViewModel } from "../../app/tournament/[id]/types";

function baseTournament(
  overrides: Partial<TournamentViewModel> = {}
): TournamentViewModel {
  return {
    id: "t1",
    updatedAt: new Date().toISOString(),
    config: { name: "Night", mode: "AMERICANO", variant: "CLASSIC" },
    players: [],
    leaderboard: [],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        matches: [
          {
            id: "m1",
            court: 1,
            teamA: ["a", "b"],
            teamB: ["c", "d"],
            scoreA: 12,
            scoreB: 12,
            completed: true
          }
        ]
      }
    ],
    ...overrides
  };
}

test("Americano completes when all matches scored", () => {
  assert.equal(isTournamentComplete(baseTournament()), true);
});

test("Mexicano does not complete when round scored without endedAt", () => {
  assert.equal(
    isTournamentComplete(
      baseTournament({
        config: { name: "Mx", mode: "MEXICANO", variant: "CLASSIC" },
        endedAt: null
      })
    ),
    false
  );
});

test("Mexicano completes when endedAt is set", () => {
  assert.equal(
    isTournamentComplete(
      baseTournament({
        config: { name: "Mx", mode: "MEXICANO", variant: "CLASSIC" },
        endedAt: new Date().toISOString()
      })
    ),
    true
  );
});
