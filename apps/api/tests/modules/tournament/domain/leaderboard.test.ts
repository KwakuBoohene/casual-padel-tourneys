import test from "node:test";
import assert from "node:assert/strict";

import { gameWinRate, matchWinRate, standingsLineFromRecord } from "@padel/shared";

import { createTournamentState } from "../../../../src/modules/tournament/domain/createTournamentState.js";
import { buildLeaderboard } from "../../../../src/modules/tournament/domain/leaderboard.js";
import type { TournamentState } from "../../../../src/types/state.js";

function americano(): TournamentState {
  return createTournamentState(
    {
      name: "Draw Test",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: ["Ana", "Ben", "Cam", "Dee", "Eve", "Fay", "Gus", "Hal"].map((name) => ({ name })),
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    },
    "owner-1"
  );
}

function score(state: TournamentState, scoreA: number, scoreB: number, completed = true): void {
  const match = state.rounds[0].matches[0];
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.completed = completed;
}

function rebuild(state: TournamentState) {
  return buildLeaderboard(state.players, state.config.scoringMode, state.rounds);
}

function entryFor(state: TournamentState, playerId: string) {
  return rebuild(state).find((row) => row.playerId === playerId)!;
}

test("a tied Americano match counts as a draw for all four players", () => {
  const state = americano();
  const match = state.rounds[0].matches[0];
  score(state, 12, 12);

  const board = rebuild(state);
  for (const playerId of [...match.teamA, ...match.teamB]) {
    const entry = board.find((row) => row.playerId === playerId)!;
    assert.equal(entry.matchesDrawn, 1, `${entry.name} should have one draw`);
  }
});

test("players not in the tied match get no draw", () => {
  const state = americano();
  const match = state.rounds[0].matches[0];
  score(state, 12, 12);

  const involved = new Set<string>([...match.teamA, ...match.teamB]);
  for (const entry of rebuild(state)) {
    if (involved.has(entry.playerId)) continue;
    assert.equal(entry.matchesDrawn, 0, `${entry.name} was not in the tied match`);
  }
});

test("a decided match is not a draw", () => {
  const state = americano();
  const match = state.rounds[0].matches[0];
  score(state, 16, 8);
  for (const playerId of [...match.teamA, ...match.teamB]) {
    assert.equal(entryFor(state, playerId).matchesDrawn, 0);
  }
});

test("an unfinished match with equal scores is not a draw yet", () => {
  const state = americano();
  const match = state.rounds[0].matches[0];
  score(state, 12, 12, false);
  for (const playerId of [...match.teamA, ...match.teamB]) {
    assert.equal(entryFor(state, playerId).matchesDrawn, 0, "nothing was played");
  }
});

test("a voided match never credits a draw, even with equal scores on record", () => {
  const state = americano();
  const match = state.rounds[0].matches[0];
  score(state, 12, 12);
  match.voidedAt = new Date().toISOString();

  for (const playerId of [...match.teamA, ...match.teamB]) {
    assert.equal(entryFor(state, playerId).matchesDrawn, 0, "voided matches never count");
  }
});

test("Regular scoring reports no draws at all — it cannot draw", () => {
  const state = americano();
  state.config.scoringMode = "REGULAR";
  score(state, 12, 12);

  for (const entry of rebuild(state)) {
    assert.equal(entry.matchesDrawn, 0);
  }
});

test("a draw counts in matches played but adds no points", () => {
  const state = americano();
  const match = state.rounds[0].matches[0];
  const playerId = match.teamA[0];
  const before = entryFor(state, playerId);
  assert.equal(before.matchesDrawn, 0);

  score(state, 12, 12);
  const after = entryFor(state, playerId);
  assert.equal(after.matchesDrawn, 1);
  assert.equal(after.totalPoints, before.totalPoints, "a draw adds no points");
});

test("the rest of the leaderboard row is untouched by the draw count", () => {
  const state = americano();
  const baseline = rebuild(state).map(({ matchesDrawn: _drawn, ...rest }) => rest);
  score(state, 12, 12);
  const after = rebuild(state).map(({ matchesDrawn: _drawn, ...rest }) => rest);
  assert.deepEqual(after, baseline, "only matchesDrawn should differ");
});

test("the shared helpers read an API row directly: Americano gets MWR but no GWR", () => {
  const entry = {
    playerId: "p1",
    name: "Ana",
    rank: 1,
    totalPoints: 60,
    gamesPlayed: 6,
    matchesWon: 3,
    matchesLost: 2,
    matchesDrawn: 1,
    gamesWon: 0,
    gamesLost: 0
  };
  const line = standingsLineFromRecord({
    wins: entry.matchesWon,
    losses: entry.matchesLost,
    draws: entry.matchesDrawn,
    gamesWon: entry.gamesWon,
    gamesLost: entry.gamesLost
  });
  assert.equal(line.matchesPlayed, 6, "the draw is in the denominator");
  assert.equal(matchWinRate(line), 0.5);
  assert.equal(gameWinRate(line), null, "Americano records no games");
});

test("dropping the draw would overstate match win rate — this is why the field exists", () => {
  const withDraw = standingsLineFromRecord({
    wins: 3,
    losses: 2,
    draws: 1,
    gamesWon: 0,
    gamesLost: 0
  });
  const withoutDraw = standingsLineFromRecord({
    wins: 3,
    losses: 2,
    draws: 0,
    gamesWon: 0,
    gamesLost: 0
  });
  assert.equal(matchWinRate(withDraw), 0.5);
  assert.equal(matchWinRate(withoutDraw), 0.6);
});

test("an absent matchesDrawn behaves exactly as zero, so old payloads are safe", () => {
  const line = standingsLineFromRecord({ wins: 4, losses: 2, gamesWon: 20, gamesLost: 10 });
  assert.equal(line.matchesPlayed, 6);
  assert.equal(matchWinRate(line), 4 / 6);
});
