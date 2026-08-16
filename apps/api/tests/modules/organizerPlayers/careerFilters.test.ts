import test from "node:test";
import assert from "node:assert/strict";

import { signUser, withApp, type CareerTestApp, type LeaderboardRow } from "./careerTestApp.js";

async function seedAmericanoWin(app: CareerTestApp, token: string): Promise<void> {
  const create = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "Filter Americano",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [{ name: "Bob Smith" }, { name: "Ana Ace" }, { name: "Cara" }, { name: "Dan" }],
      courts: 1,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    }
  });
  assert.equal(create.statusCode, 200, create.body);
  const tournament = create.json().data;

  const score = await app.inject({
    method: "POST",
    url: "/tournaments/score",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tournamentId: tournament.id,
      matchId: tournament.rounds[0].matches[0].id,
      scoreA: 14,
      scoreB: 10,
      expectedVersion: tournament.version
    }
  });
  assert.equal(score.statusCode, 200, score.body);
}

async function seedKohWin(app: CareerTestApp, token: string): Promise<void> {
  const create = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "Filter KOH",
      mode: "KING_OF_THE_HILL",
      courts: 1,
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
            { playerA: { name: "Kim Smithson" }, playerB: { name: "Lee" } },
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
}

async function board(app: CareerTestApp, token: string, query: string) {
  const response = await app.inject({
    method: "GET",
    url: `/me/players/leaderboard?${query}`,
    headers: { authorization: `Bearer ${token}` }
  });
  return { statusCode: response.statusCode, body: response.json() as { data?: { mode: string; q?: string; rows: LeaderboardRow[] }; message?: string } };
}

test("mode filter narrows the career board to one tournament mode", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    await seedAmericanoWin(app, token);
    await seedKohWin(app, token);

    const overall = await board(app, token, "range=all");
    assert.equal(overall.statusCode, 200);
    assert.equal(overall.body.data?.mode, "overall");
    assert.equal(overall.body.data?.rows.length, 8);

    const americano = await board(app, token, "range=all&mode=AMERICANO");
    assert.equal(americano.body.data?.mode, "AMERICANO");
    assert.deepEqual(
      americano.body.data?.rows.map((row) => row.name).sort(),
      ["Ana Ace", "Bob Smith", "Cara", "Dan"]
    );

    const koh = await board(app, token, "range=all&mode=KING_OF_THE_HILL");
    assert.deepEqual(
      koh.body.data?.rows.map((row) => row.name).sort(),
      ["Kim Smithson", "Lee", "Mo", "Nia"]
    );

    const mexicano = await board(app, token, "range=all&mode=MEXICANO");
    assert.deepEqual(mexicano.body.data?.rows, []);
  });
});

test("q matches a name substring and combines with range and mode", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    await seedAmericanoWin(app, token);
    await seedKohWin(app, token);

    const searched = await board(app, token, "range=all&q=mit");
    assert.equal(searched.body.data?.q, "mit");
    assert.deepEqual(
      searched.body.data?.rows.map((row) => row.name).sort(),
      ["Bob Smith", "Kim Smithson"]
    );

    const scoped = await board(app, token, "range=all&mode=AMERICANO&q=MIT");
    assert.deepEqual(scoped.body.data?.rows.map((row) => row.name), ["Bob Smith"]);

    const empty = await board(app, token, "range=all&q=");
    assert.equal(empty.body.data?.q, undefined);
    assert.equal(empty.body.data?.rows.length, 8);

    const miss = await board(app, token, "range=all&q=zzz");
    assert.deepEqual(miss.body.data?.rows, []);
  });
});

test("bad mode and range values answer 400 with a targeted message", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);

    const badMode = await board(app, token, "mode=KING_OF_THE_COURT");
    assert.equal(badMode.statusCode, 400);
    assert.match(badMode.body.message ?? "", /^mode must be overall/);

    const badRange = await board(app, token, "range=decade");
    assert.equal(badRange.statusCode, 400);
    assert.match(badRange.body.message ?? "", /^range must be/);
  });
});
