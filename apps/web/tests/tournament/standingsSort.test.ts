import assert from "node:assert/strict";
import test from "node:test";
import { standingsCells, standingsLineFromRecord } from "@padel/shared";

import { buildOutstandingPlayerRows } from "../../app/tournament/[id]/components/outstandingPlayers";
import { ariaSortFor } from "../../app/tournament/[id]/leaderboard/StandingsHeaderRow";
import type { TournamentViewModel } from "../../app/tournament/[id]/types";

// --- aria-sort reflects the active column -------------------------------------------------------

test("aria-sort is none for every column until one is chosen", () => {
  assert.equal(ariaSortFor(null, "mwr"), "none");
  assert.equal(ariaSortFor(null, "pts"), "none");
});

test("aria-sort describes the direction on the active column only", () => {
  const sort = { key: "mwr", direction: "asc" } as const;
  assert.equal(ariaSortFor(sort, "mwr"), "ascending");
  assert.equal(ariaSortFor(sort, "gwr"), "none", "other columns stay none");
  assert.equal(ariaSortFor({ key: "mwr", direction: "desc" }, "mwr"), "descending");
});

// --- the Americano game bug (epic 27, DECISIONS 17-19) ------------------------------------------

function americanoWithOneMatch(): TournamentViewModel {
  return {
    id: "t1",
    publicToken: "tok",
    config: { name: "Friday", mode: "AMERICANO", variant: "CLASSIC", courts: 1, pointsPerMatch: 24 },
    players: [
      { id: "p1", name: "Ada", totalPoints: 24, gamesPlayed: 1 },
      { id: "p2", name: "Bea", totalPoints: 10, gamesPlayed: 1 }
    ],
    leaderboard: [
      { playerId: "p1", name: "Ada", totalPoints: 24, gamesPlayed: 1, rank: 1 },
      { playerId: "p2", name: "Bea", totalPoints: 10, gamesPlayed: 1, rank: 2 }
    ],
    rounds: [
      {
        id: "r1",
        roundNumber: 1,
        isLocked: false,
        matches: [
          {
            id: "m1",
            round: 1,
            court: 1,
            teamA: ["p1", "x"],
            teamB: ["p2", "y"],
            scoreA: 24,
            scoreB: 10,
            completed: true
          }
        ]
      }
    ],
    endedAt: null
  } as unknown as TournamentViewModel;
}

test("an Americano match never credits a game, matching mobile exactly", () => {
  for (const row of buildOutstandingPlayerRows(americanoWithOneMatch())) {
    assert.equal(row.gamesWon ?? 0, 0, `${row.name} should have no games won`);
    assert.equal(row.gamesLost ?? 0, 0, `${row.name} should have no games lost`);
  }
});

test("the winner's result still lands in W and the rally points", () => {
  const rows = buildOutstandingPlayerRows(americanoWithOneMatch());
  const winner = rows.find((row) => row.name === "Ada")!;
  assert.equal(winner.wins, 1);
  assert.equal(winner.americanoPointsWon, 24);
  assert.equal(winner.americanoPointsLost, 10);
});

test("game win rate reads as unavailable, not a fabricated 100%", () => {
  const winner = buildOutstandingPlayerRows(americanoWithOneMatch()).find((r) => r.name === "Ada")!;
  const line = standingsLineFromRecord({
    wins: winner.wins,
    losses: winner.losses,
    draws: winner.draws,
    gamesWon: winner.gamesWon ?? 0,
    gamesLost: winner.gamesLost ?? 0
  });
  assert.equal(standingsCells(line).gwr, "—");
});

test("web rows carry draws, so match win rate has the right denominator", () => {
  const tournament = americanoWithOneMatch();
  tournament.rounds[0].matches[0].scoreA = 12;
  tournament.rounds[0].matches[0].scoreB = 12;
  const row = buildOutstandingPlayerRows(tournament).find((r) => r.name === "Ada")!;
  assert.equal(row.draws, 1);
  const line = standingsLineFromRecord({
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    gamesWon: row.gamesWon ?? 0,
    gamesLost: row.gamesLost ?? 0
  });
  assert.equal(line.matchesPlayed, 1, "the draw counts as a match played");
});
