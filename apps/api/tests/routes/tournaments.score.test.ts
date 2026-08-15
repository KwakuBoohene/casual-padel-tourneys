import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function signUser(id: string, email = `${id}@example.com`): string {
  // isGuest bypasses requireVerifiedEmail's Prisma lookup so tests run without DB.
  return jwt.sign(
    { sub: id, email, name: "Test User", emailVerified: true, isGuest: true },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

const regularCreatePayload = {
  name: "Regular Score API",
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
  scoringMode: "REGULAR",
  regularScoring: {
    setFormat: "FULL_SET",
    gameWinBy: 2,
    setsToWin: 1,
    setTiebreakTo: 7
  },
  targetGamesPerPlayer: 3
};

async function withApp<T>(fn: (app: Awaited<ReturnType<typeof createApp>>) => Promise<T>): Promise<T> {
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    return await fn(app);
  } finally {
    await app.close();
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
    if (originalRedis === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedis;
    }
  }
}

test("POST /tournaments/score draft then complete awards once", async () => {
  await withApp(async (app) => {
    const token = signUser("owner-score-1");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: regularCreatePayload
    });
    assert.equal(createResponse.statusCode, 200);
    const created = createResponse.json().data;
    assert.equal(created.config.scoringMode, "REGULAR");
    const matchId = created.rounds[0].matches[0].id;
    const [a1] = created.rounds[0].matches[0].teamA;

    const draft = await app.inject({
      method: "POST",
      url: "/tournaments/score",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: created.id,
        matchId,
        sets: [{ setNumber: 1, gamesA: 4, gamesB: 4 }],
        status: "DRAFT",
        expectedVersion: created.version
      }
    });
    assert.equal(draft.statusCode, 200);
    const afterDraft = draft.json().data;
    assert.equal(afterDraft.rounds[0].matches[0].completed, false);
    const draftPlayer = afterDraft.players.find((p: { id: string }) => p.id === a1);
    assert.equal(draftPlayer.matchesWon ?? 0, 0);

    const complete = await app.inject({
      method: "POST",
      url: "/tournaments/score",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: created.id,
        matchId,
        sets: [{ setNumber: 1, gamesA: 7, gamesB: 5 }],
        status: "COMPLETE",
        expectedVersion: afterDraft.version
      }
    });
    assert.equal(complete.statusCode, 200);
    const afterComplete = complete.json().data;
    assert.equal(afterComplete.rounds[0].matches[0].completed, true);
    const winner = afterComplete.players.find((p: { id: string }) => p.id === a1);
    assert.equal(winner.matchesWon, 1);
    assert.equal(winner.setsWon, 1);
    assert.equal(winner.gamesWon, 7);
  });
});

test("POST /tournaments/score rejects 6–6 COMPLETE without set TB", async () => {
  await withApp(async (app) => {
    const token = signUser("owner-score-2");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: regularCreatePayload
    });
    const created = createResponse.json().data;
    const matchId = created.rounds[0].matches[0].id;

    const response = await app.inject({
      method: "POST",
      url: "/tournaments/score",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: created.id,
        matchId,
        sets: [{ setNumber: 1, gamesA: 6, gamesB: 6 }],
        status: "COMPLETE",
        expectedVersion: created.version
      }
    });
    assert.equal(response.statusCode, 400);
    assert.match(response.json().message ?? "", /tiebreak/i);
  });
});

test("POST /tournaments/score rejects points body on Regular tournament", async () => {
  await withApp(async (app) => {
    const token = signUser("owner-score-3");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: regularCreatePayload
    });
    const created = createResponse.json().data;

    const response = await app.inject({
      method: "POST",
      url: "/tournaments/score",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: created.id,
        matchId: created.rounds[0].matches[0].id,
        scoreA: 24,
        scoreB: 16,
        expectedVersion: created.version
      }
    });
    assert.equal(response.statusCode, 400);
    assert.match(response.json().message ?? "", /Points body|Regular/i);
  });
});
