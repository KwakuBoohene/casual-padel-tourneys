import test from "node:test";
import assert from "node:assert/strict";

import { applyCloseTournament, unfinishedMatchCount } from "../../../../src/modules/tournament/domain/closeOps.js";
import { createTournamentState } from "../../../../src/modules/tournament/domain/createTournamentState.js";
import type { TournamentState } from "../../../../src/types/state.js";

function americano(): TournamentState {
  return createTournamentState(
    {
      name: "Close Test",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [
        { name: "A" },
        { name: "B" },
        { name: "C" },
        { name: "D" },
        { name: "E" },
        { name: "F" },
        { name: "G" },
        { name: "H" }
      ],
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    },
    "owner-1"
  );
}

function allMatches(state: TournamentState) {
  return state.rounds.flatMap((round) => round.matches);
}

test("unfinishedMatchCount counts every unplayed match", () => {
  const state = americano();
  const total = allMatches(state).length;
  assert.ok(total > 0);
  assert.equal(unfinishedMatchCount(state), total);

  allMatches(state)[0].completed = true;
  assert.equal(unfinishedMatchCount(state), total - 1);
});

test("applyCloseTournament voids only unplayed matches and sets endedAt", () => {
  const state = americano();
  const matches = allMatches(state);
  matches[0].completed = true;
  matches[0].scoreA = 16;
  matches[0].scoreB = 8;
  const versionBefore = state.version;

  const voidedMatchCount = applyCloseTournament(state);

  assert.equal(voidedMatchCount, matches.length - 1);
  assert.ok(state.endedAt);
  assert.equal(state.version, versionBefore + 1);

  const [completed, ...rest] = allMatches(state);
  assert.equal(completed.voidedAt, undefined);
  assert.equal(completed.scoreA, 16);
  assert.ok(rest.every((match) => match.voidedAt));
});

test("applyCloseTournament keeps partial scores on voided matches", () => {
  const state = americano();
  const target = allMatches(state)[0];
  target.scoreA = 9;
  target.scoreB = 4;

  applyCloseTournament(state);

  assert.ok(target.voidedAt, "match should be voided");
  assert.equal(target.completed, false);
  assert.equal(target.scoreA, 9, "partial score must survive for auditing");
  assert.equal(target.scoreB, 4);
});

test("applyCloseTournament is idempotent and does not re-stamp voided matches", () => {
  const state = americano();
  const first = applyCloseTournament(state);
  assert.ok(first > 0);

  const endedAt = state.endedAt;
  const stamps = allMatches(state).map((match) => match.voidedAt);
  const versionAfterFirst = state.version;

  const second = applyCloseTournament(state);

  assert.equal(second, 0);
  assert.equal(state.endedAt, endedAt);
  assert.equal(state.version, versionAfterFirst, "a no-op close must not bump version");
  assert.deepEqual(allMatches(state).map((match) => match.voidedAt), stamps);
});

test("applyCloseTournament voids nothing when every match is played", () => {
  const state = americano();
  for (const match of allMatches(state)) {
    match.completed = true;
  }

  const voidedMatchCount = applyCloseTournament(state);

  assert.equal(voidedMatchCount, 0);
  assert.ok(state.endedAt, "a fully played event still closes");
  assert.ok(allMatches(state).every((match) => !match.voidedAt));
});
