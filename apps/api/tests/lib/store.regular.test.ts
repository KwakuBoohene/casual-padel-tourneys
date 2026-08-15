import test from "node:test";
import assert from "node:assert/strict";

import { createTournament, submitRegularScore, submitScore } from "../../src/lib/store.js";

function regularTournament() {
  return createTournament(
    {
      name: "Regular Board",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [
        { name: "A1" },
        { name: "A2" },
        { name: "B1" },
        { name: "B2" },
        { name: "C1" },
        { name: "C2" },
        { name: "D1" },
        { name: "D2" }
      ],
      courts: 2,
      pointsPerMatch: 24,
      scoringMode: "REGULAR",
      regularScoring: {
        setFormat: "FULL_SET",
        gameWinBy: 1,
        setsToWin: 1
      },
      targetGamesPerPlayer: 4
    },
    "org-regular"
  );
}

test("draft Regular score does not change standings", () => {
  const tournament = regularTournament();
  const match = tournament.rounds[0].matches[0];

  const updated = submitRegularScore(tournament.id, match.id, [{ setNumber: 1, gamesA: 4, gamesB: 4 }], {
    complete: false
  });

  assert.equal(updated.rounds[0].matches[0].completed, false);
  for (const player of updated.players) {
    assert.equal(player.matchesWon ?? 0, 0);
    assert.equal(player.setsWon ?? 0, 0);
    assert.equal(player.gamesWon ?? 0, 0);
    assert.equal(player.totalPoints, 0);
  }
});

test("complete Regular match awards matches/sets/games", () => {
  const tournament = regularTournament();
  const match = tournament.rounds[0].matches[0];
  const [a1, a2] = match.teamA;
  const [b1, b2] = match.teamB;

  const updated = submitRegularScore(tournament.id, match.id, [{ setNumber: 1, gamesA: 6, gamesB: 4 }], {
    complete: true
  });

  assert.equal(updated.rounds[0].matches[0].completed, true);
  const byId = Object.fromEntries(updated.players.map((p) => [p.id, p]));
  assert.equal(byId[a1].matchesWon, 1);
  assert.equal(byId[a2].matchesWon, 1);
  assert.equal(byId[b1].matchesLost, 1);
  assert.equal(byId[b2].matchesLost, 1);
  assert.equal(byId[a1].setsWon, 1);
  assert.equal(byId[a1].gamesWon, 6);
  assert.equal(byId[b1].gamesWon, 4);
  assert.equal(byId[a1].totalPoints, 0);
});

test("submitScore rejects Regular tournaments", () => {
  const tournament = regularTournament();
  const match = tournament.rounds[0].matches[0];
  assert.throws(() => submitScore(tournament.id, match.id, 24, 16), /submitRegularScore/);
});
