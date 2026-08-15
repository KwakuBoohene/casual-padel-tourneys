import assert from "node:assert/strict";
import test from "node:test";

import type { TournamentConfig } from "@padel/shared";

import {
  advanceMexicanoRound,
  createTournament,
  endMexicanoNight,
  getTournament,
  submitScore
} from "../../src/lib/store.js";

function mexicanoConfig(): TournamentConfig {
  return {
    name: "Mexicano Ladder",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `P${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24
  };
}

test("advanceMexicanoRound builds 1+3 vs 2+4 from standings", () => {
  const tournament = createTournament(mexicanoConfig(), "org_mx");
  assert.equal(tournament.rounds.length, 1);

  const round1 = tournament.rounds[0];
  // Deterministic points: give court1 a decisive result, court2 another.
  // After both matches, sort by totalPoints and check ladder.
  let versioned = tournament;
  for (const match of round1.matches) {
    // teamA gets higher score on first court, teamB on second — any completed scores work;
    // we then override standings by submitting known scores.
    versioned = submitScore(versioned.id, match.id, 10, 14);
  }

  // Force known standings for ladder assertion (edit still allowed — no later round yet).
  const byName = new Map(versioned.players.map((player) => [player.name, player]));
  const points: Record<string, number> = {
    P1: 40,
    P2: 30,
    P3: 20,
    P4: 10,
    P5: 8,
    P6: 6,
    P7: 4,
    P8: 2
  };
  for (const [name, total] of Object.entries(points)) {
    const player = byName.get(name);
    assert.ok(player);
    player.totalPoints = total;
  }

  const advanced = advanceMexicanoRound(versioned.id);
  assert.equal(advanced.rounds.length, 2);
  const round2 = advanced.rounds[1];
  assert.equal(round2.roundNumber, 2);
  assert.equal(round2.matches.length, 2);

  const id = (name: string) => byName.get(name)!.id;
  assert.deepEqual(round2.matches[0].teamA, [id("P1"), id("P3")]);
  assert.deepEqual(round2.matches[0].teamB, [id("P2"), id("P4")]);
  assert.deepEqual(round2.matches[1].teamA, [id("P5"), id("P7")]);
  assert.deepEqual(round2.matches[1].teamB, [id("P6"), id("P8")]);
});

test("submitScore blocks edits after later round exists", () => {
  const tournament = createTournament(mexicanoConfig(), "org_mx2");
  for (const match of tournament.rounds[0].matches) {
    submitScore(tournament.id, match.id, 12, 12);
  }
  advanceMexicanoRound(tournament.id);
  const firstMatchId = tournament.rounds[0].matches[0].id;
  assert.throws(
    () => submitScore(tournament.id, firstMatchId, 15, 9),
    /later round has started/
  );
});

test("advanceMexicanoRound refuses double advance", () => {
  const tournament = createTournament(mexicanoConfig(), "org_mx4");
  for (const match of tournament.rounds[0].matches) {
    submitScore(tournament.id, match.id, 12, 12);
  }
  advanceMexicanoRound(tournament.id);
  assert.throws(() => advanceMexicanoRound(tournament.id), /already generated/);
});

test("endMexicanoNight discards incomplete latest round and reverses points", () => {
  const tournament = createTournament(mexicanoConfig(), "org_mx_end");
  for (const match of tournament.rounds[0].matches) {
    submitScore(tournament.id, match.id, 16, 8);
  }
  advanceMexicanoRound(tournament.id);

  const afterAdvance = getTournament(tournament.id);
  assert.ok(afterAdvance);
  const scoredOne = submitScore(tournament.id, afterAdvance.rounds[1].matches[0].id, 14, 10);
  const playerId = scoredOne.rounds[1].matches[0].teamA[0];
  const pointsBeforeDiscard = scoredOne.players.find((player) => player.id === playerId)!.totalPoints;

  const ended = endMexicanoNight(tournament.id);
  assert.ok(ended.endedAt);
  assert.equal(ended.rounds.length, 1);
  assert.equal(ended.rounds[0].roundNumber, 1);
  const pointsAfter = ended.players.find((player) => player.id === playerId)!.totalPoints;
  assert.equal(pointsAfter, pointsBeforeDiscard - 14);
  assert.throws(() => submitScore(tournament.id, ended.rounds[0].matches[0].id, 12, 12), /already ended/);
  assert.throws(() => endMexicanoNight(tournament.id), /already ended/);
});

test("endMexicanoNight keeps a fully scored latest round", () => {
  const tournament = createTournament(mexicanoConfig(), "org_mx_end2");
  for (const match of tournament.rounds[0].matches) {
    submitScore(tournament.id, match.id, 12, 12);
  }
  const ended = endMexicanoNight(tournament.id);
  assert.ok(ended.endedAt);
  assert.equal(ended.rounds.length, 1);
  assert.ok(ended.rounds[0].matches.every((match) => match.completed));
});

test("Team Mexicano advance keeps pairs together", () => {
  const teams = [
    { playerA: { name: "A1" }, playerB: { name: "A2" } },
    { playerA: { name: "B1" }, playerB: { name: "B2" } },
    { playerA: { name: "C1" }, playerB: { name: "C2" } },
    { playerA: { name: "D1" }, playerB: { name: "D2" } }
  ];
  const tournament = createTournament(
    {
      name: "Team Mx",
      mode: "MEXICANO",
      variant: "TEAM",
      schedulingMode: "TOTAL_TIME",
      players: teams.flatMap((team) => [team.playerA, team.playerB]),
      teams,
      courts: 2,
      pointsPerMatch: 24
    },
    "org_team_mx"
  );
  assert.equal(tournament.fixedPairs?.length, 4);
  for (const match of tournament.rounds[0].matches) {
    submitScore(tournament.id, match.id, 14, 10);
  }
  const advanced = advanceMexicanoRound(tournament.id);
  assert.equal(advanced.rounds.length, 2);
  for (const match of advanced.rounds[1].matches) {
    const pairA = tournament.fixedPairs!.find(
      (pair) =>
        (pair.playerAId === match.teamA[0] && pair.playerBId === match.teamA[1]) ||
        (pair.playerAId === match.teamA[1] && pair.playerBId === match.teamA[0])
    );
    const pairB = tournament.fixedPairs!.find(
      (pair) =>
        (pair.playerAId === match.teamB[0] && pair.playerBId === match.teamB[1]) ||
        (pair.playerAId === match.teamB[1] && pair.playerBId === match.teamB[0])
    );
    assert.ok(pairA);
    assert.ok(pairB);
  }
});
