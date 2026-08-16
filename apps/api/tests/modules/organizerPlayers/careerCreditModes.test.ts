import test from "node:test";
import assert from "node:assert/strict";

import {
  countDeltas,
  signUser,
  withApp,
  type CareerTestApp,
  type LeaderboardRow
} from "./careerTestApp.js";

const AMERICANO_PLAYERS = [
  { name: "Ana" },
  { name: "Ben" },
  { name: "Cara" },
  { name: "Dan" }
];

async function createAmericano(
  app: CareerTestApp,
  token: string,
  options: { name: string; contribute?: boolean }
) {
  const response = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: options.name,
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: AMERICANO_PLAYERS,
      courts: 1,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3,
      ...(options.contribute === undefined
        ? {}
        : { contributeToCareerLeaderboard: options.contribute })
    }
  });
  assert.equal(response.statusCode, 200, response.body);
  return response.json().data;
}

async function scoreFirstMatch(
  app: CareerTestApp,
  token: string,
  tournament: { id: string; version: number; rounds: { matches: { id: string }[] }[] },
  scoreA: number,
  scoreB: number
) {
  const match = tournament.rounds[0].matches[0];
  const response = await app.inject({
    method: "POST",
    url: "/tournaments/score",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tournamentId: tournament.id,
      matchId: match.id,
      scoreA,
      scoreB,
      expectedVersion: tournament.version
    }
  });
  assert.equal(response.statusCode, 200, response.body);
  return { match, state: response.json().data };
}

async function leaderboard(app: CareerTestApp, token: string, query = "range=all") {
  const response = await app.inject({
    method: "GET",
    url: `/me/players/leaderboard?${query}`,
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(response.statusCode, 200, response.body);
  return response.json().data as { mode: string; q?: string; rows: LeaderboardRow[] };
}

test("opted-in Americano match credits all four named players", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const tournament = await createAmericano(app, token, { name: "Career Americano" });
    assert.equal(tournament.config.contributeToCareerLeaderboard, true, "opt-in is the default");

    const { match } = await scoreFirstMatch(app, token, tournament, 14, 10);
    assert.equal(await countDeltas(organizerId), 4);

    const board = await leaderboard(app, token);
    assert.equal(board.rows.length, 4);

    const winners = new Set(match.teamA as unknown as string[]);
    const namesById = new Map<string, string>(
      (tournament.players as { id: string; name: string }[]).map((player) => [player.id, player.name])
    );
    for (const row of board.rows) {
      const isWinner = [...winners].some((playerId) => namesById.get(playerId) === row.name);
      assert.equal(row.matchesWon, isWinner ? 1 : 0, `${row.name} match wins`);
      assert.equal(row.matchesLost, isWinner ? 0 : 1, `${row.name} match losses`);
      assert.equal(row.gamesWon, isWinner ? 14 : 10, `${row.name} points carried as games`);
      assert.equal(row.eventsPlayed, 1);
    }
  });
});

test("re-scoring the same Americano match overwrites instead of double counting", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const tournament = await createAmericano(app, token, { name: "Career Correction" });
    const { match, state } = await scoreFirstMatch(app, token, tournament, 14, 10);

    const corrected = await app.inject({
      method: "POST",
      url: "/tournaments/score",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: tournament.id,
        matchId: match.id,
        scoreA: 8,
        scoreB: 16,
        expectedVersion: state.version
      }
    });
    assert.equal(corrected.statusCode, 200, corrected.body);
    assert.equal(await countDeltas(organizerId), 4, "still one delta per player");

    const board = await leaderboard(app, token);
    const totalMatchWins = board.rows.reduce((sum, row) => sum + row.matchesWon, 0);
    assert.equal(totalMatchWins, 2, "the corrected winners hold the only match wins");
    const winnerGames = board.rows.filter((row) => row.matchesWon === 1).map((row) => row.gamesWon);
    assert.deepEqual(winnerGames.sort(), [16, 16]);
  });
});

test("opted-out Americano writes no career deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const tournament = await createAmericano(app, token, {
      name: "Private Americano",
      contribute: false
    });
    assert.equal(tournament.config.contributeToCareerLeaderboard, false);

    await scoreFirstMatch(app, token, tournament, 14, 10);
    assert.equal(await countDeltas(organizerId), 0);
    assert.deepEqual((await leaderboard(app, token)).rows, []);
  });
});

test("opted-out King of the Hill writes no career deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Private KOH",
        mode: "KING_OF_THE_HILL",
        courts: 1,
        contributeToCareerLeaderboard: false,
        regularScoring: { setFormat: "FULL_SET", gameWinBy: 2, setsToWin: 1, setTiebreakTo: 7 }
      }
    });
    assert.equal(create.statusCode, 200, create.body);
    const created = create.json().data;

    const assign = await app.inject({
      method: "PUT",
      url: `/koh/tournaments/${created.id}/assignment`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        courts: [
          {
            courtNumber: 1,
            units: [
              { playerA: { name: "Kim" }, playerB: { name: "Lee" } },
              { playerA: { name: "Mo" }, playerB: { name: "Nia" } }
            ]
          }
        ]
      }
    });
    assert.equal(assign.statusCode, 200, assign.body);
    const hub = assign.json().data;

    const score = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${created.id}/courts/${hub.courts[0].id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        status: "COMPLETE",
        sets: [{ setNumber: 1, gamesA: 6, gamesB: 4 }]
      }
    });
    assert.equal(score.statusCode, 200, score.body);

    assert.equal(await countDeltas(organizerId), 0);
    assert.deepEqual((await leaderboard(app, token)).rows, []);
  });
});
