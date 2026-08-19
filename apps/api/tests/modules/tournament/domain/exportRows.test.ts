import test from "node:test";
import assert from "node:assert/strict";

import { buildTournamentExportRows } from "../../../../src/modules/tournament/domain/exportRows.js";
import { createTournamentState } from "../../../../src/modules/tournament/domain/createTournamentState.js";
import { buildLeaderboard } from "../../../../src/modules/tournament/domain/leaderboard.js";
import type { TournamentState } from "../../../../src/types/state.js";

function americano(): TournamentState {
  return createTournamentState(
    {
      name: "Export Test",
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

function scoreFirstMatch(state: TournamentState, scoreA: number, scoreB: number): void {
  const match = state.rounds[0].matches[0];
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.completed = true;
  for (const id of match.teamA) {
    const player = state.players.find((p) => p.id === id)!;
    player.totalPoints += scoreA;
  }
  for (const id of match.teamB) {
    const player = state.players.find((p) => p.id === id)!;
    player.totalPoints += scoreB;
  }
  state.leaderboard = buildLeaderboard(state.players, state.config.scoringMode);
}

test("every player gets a row, including those who never played", () => {
  const state = americano();
  const rows = buildTournamentExportRows(state);
  assert.equal(rows.length, state.players.length);
  assert.ok(rows.every((row) => row.wins === 0 && row.losses === 0));
});

test("Americano wins, losses and rally points come from completed matches", () => {
  const state = americano();
  scoreFirstMatch(state, 16, 8);
  const match = state.rounds[0].matches[0];

  const rows = buildTournamentExportRows(state);
  const byName = new Map(rows.map((row) => [row.name, row]));
  const winnerName = state.players.find((p) => p.id === match.teamA[0])!.name;
  const loserName = state.players.find((p) => p.id === match.teamB[0])!.name;

  const winner = byName.get(winnerName)!;
  assert.equal(winner.wins, 1);
  assert.equal(winner.losses, 0);
  assert.equal(winner.americanoPointsWon, 16);
  assert.equal(winner.americanoPointsLost, 8);

  const loser = byName.get(loserName)!;
  assert.equal(loser.wins, 0);
  assert.equal(loser.losses, 1);
  assert.equal(loser.americanoPointsWon, 8);
  assert.equal(loser.americanoPointsLost, 16);
});

test("a tied Americano match is a draw for both sides", () => {
  const state = americano();
  scoreFirstMatch(state, 12, 12);
  const match = state.rounds[0].matches[0];

  const rows = buildTournamentExportRows(state);
  const byName = new Map(rows.map((row) => [row.name, row]));
  for (const id of [...match.teamA, ...match.teamB]) {
    const name = state.players.find((p) => p.id === id)!.name;
    const row = byName.get(name)!;
    assert.equal(row.draws, 1);
    assert.equal(row.wins, 0);
    assert.equal(row.losses, 0);
  }
});

test("an unfinished match contributes nothing, even with a partial score", () => {
  const state = americano();
  const match = state.rounds[0].matches[0];
  match.scoreA = 9;
  match.scoreB = 4;
  match.completed = false;

  const rows = buildTournamentExportRows(state);
  assert.ok(rows.every((row) => row.wins === 0 && row.losses === 0));
  assert.ok(rows.every((row) => (row.americanoPointsWon ?? 0) === 0));
});

test("Regular standings come straight from the player aggregates", () => {
  const state = americano();
  state.config.scoringMode = "REGULAR";
  const player = state.players[0];
  player.matchesWon = 2;
  player.matchesLost = 1;
  player.gamesWon = 12;
  player.gamesLost = 7;
  state.leaderboard = buildLeaderboard(state.players, "REGULAR");

  const row = buildTournamentExportRows(state).find((r) => r.name === player.name)!;
  assert.equal(row.wins, 2);
  assert.equal(row.losses, 1);
  assert.equal(row.gamesWon, 12);
  assert.equal(row.gamesLost, 7);
  assert.equal(row.draws, 0, "Regular matches cannot draw");
});
