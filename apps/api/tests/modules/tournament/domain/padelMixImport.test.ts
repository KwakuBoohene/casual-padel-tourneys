import test from "node:test";
import assert from "node:assert/strict";

import { buildPadelMixTournamentState } from "../../../../src/modules/tournament/domain/padelMixImport.js";
import { applyPointsScore } from "../../../../src/modules/tournament/domain/pointsScore.js";
import { isAppError } from "../../../../src/shared/kernel/appError.js";

import { padelMixFixture } from "./padelMixFixture.js";

function assertRejected(payload: unknown, pattern: RegExp): void {
  assert.throws(
    () => buildPadelMixTournamentState(payload, "org-1"),
    (error: unknown) => isAppError(error) && error.httpStatus === 400 && pattern.test(error.message)
  );
}

test("import maps PadelMix settings onto an Americano config", () => {
  const state = buildPadelMixTournamentState(padelMixFixture(), "org-1");

  assert.equal(state.organizerId, "org-1");
  assert.equal(state.config.name, "Sunday Americano");
  assert.equal(state.config.mode, "AMERICANO");
  assert.equal(state.config.variant, "CLASSIC");
  assert.equal(state.config.courts, 2);
  assert.equal(state.config.pointsPerMatch, 16);
  assert.equal(state.config.targetGamesPerPlayer, 3);
  assert.equal(state.players.length, 8);
  assert.deepEqual(
    state.players.slice(0, 2).map((player) => [player.name, player.gender]),
    [
      ["Player 1", "MALE"],
      ["Player 2", "FEMALE"]
    ]
  );
});

test("import keeps the exact round schedule, pairings and court numbers", () => {
  const state = buildPadelMixTournamentState(padelMixFixture(), "org-1");
  const nameOf = (id: string): string => state.players.find((player) => player.id === id)?.name ?? "?";

  assert.deepEqual(
    state.rounds.map((round) => round.roundNumber),
    [1, 2, 3]
  );
  const second = state.rounds[1]!;
  assert.deepEqual(second.matches[0]!.teamA.map(nameOf), ["Player 1", "Player 3"]);
  assert.deepEqual(second.matches[0]!.teamB.map(nameOf), ["Player 5", "Player 7"]);
  // The fixture names the first match "Court 2", so numbering follows names, not order.
  assert.deepEqual(
    second.matches.map((match) => match.court),
    [2, 1]
  );
  assert.ok(state.rounds.every((round) => !round.isLocked));
  assert.ok(state.players.every((player) => player.gamesPlayed === 0 && player.totalPoints === 0));
});

test("import carries over scores already entered and locks finished rounds", () => {
  const payload = padelMixFixture({ scores: { "0:0": [10, 6], "0:1": [8, 8], "1:0": [12, 4] } });

  const state = buildPadelMixTournamentState(payload, "org-1");

  assert.equal(state.rounds[0]!.isLocked, true);
  assert.equal(state.rounds[1]!.isLocked, false);
  assert.equal(state.rounds[1]!.matches[1]!.completed, false);
  const first = state.players[0]!;
  assert.equal(first.totalPoints, 22);
  assert.equal(first.gamesPlayed, 2);
  assert.equal(state.leaderboard[0]!.playerId, first.id);
});

test("imported tournaments accept scores through the normal scoring path", () => {
  const state = buildPadelMixTournamentState(padelMixFixture(), "org-1");
  const match = state.rounds[0]!.matches[0]!;

  applyPointsScore(state, match.id, 9, 7);

  assert.equal(state.players[0]!.totalPoints, 9);
  assert.equal(state.rounds[0]!.matches[0]!.completed, true);
});

test("import renumbers rounds and drops empty ones", () => {
  const payload = padelMixFixture({ rounds: [[[0, 1, 2, 3]], [], [[4, 5, 6, 7]]] });

  const state = buildPadelMixTournamentState(payload, "org-1");

  assert.deepEqual(
    state.rounds.map((round) => [round.roundNumber, round.matches[0]!.round]),
    [
      [1, 1],
      [2, 2]
    ]
  );
});

test("import rejects formats other than classic Americano", () => {
  assertRejected(padelMixFixture({ tournamentType: "mexicano" }), /classic Americano/);
  assertRejected(padelMixFixture({ tournamentVariant: "mixed-americano" }), /classic Americano/);
  assertRejected(padelMixFixture({ stage: "playoff" }), /playoff/);
  assertRejected(padelMixFixture({ pointsPerRound: null }), /fixed number of points/);
});

test("import rejects payloads that are not a usable schedule", () => {
  assertRejected({ hello: "world" }, /did not return a PadelMix tournament/);
  assertRejected(padelMixFixture({ rounds: [] }), /no scheduled matches/);
  assertRejected(padelMixFixture({ rounds: [[[0, 1, 2, 99]]] }), /not in the PadelMix player list/);
  assertRejected(padelMixFixture({ rounds: [[[0, 1, 2, 3], [3, 4, 5, 6]]] }), /more than one place/);
  assertRejected(padelMixFixture({ courts: 1 }), /more matches than courts/);
});
