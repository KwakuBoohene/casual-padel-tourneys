import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function signUser(id: string): string {
  return jwt.sign(
    { sub: id, email: `${id}@example.com`, name: "Test User", emailVerified: true, isGuest: true },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

const americanoPayload = {
  name: "Draws On The Wire",
  mode: "AMERICANO",
  variant: "CLASSIC",
  schedulingMode: "TARGET_GAMES",
  players: ["A", "B", "C", "D", "E", "F", "G", "H"].map((name) => ({ name })),
  courts: 2,
  pointsPerMatch: 24,
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
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
}

interface Entry {
  playerId: string;
  matchesDrawn?: number;
}

/** Create an Americano event and finish its first match as a tie. */
async function tiedEvent(app: Awaited<ReturnType<typeof createApp>>, owner: string) {
  const token = signUser(owner);
  const createResponse = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: americanoPayload
  });
  assert.equal(createResponse.statusCode, 200);
  const created = createResponse.json().data;
  const match = created.rounds[0].matches[0];

  const scored = await app.inject({
    method: "POST",
    url: "/tournaments/score",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tournamentId: created.id,
      matchId: match.id,
      scoreA: 12,
      scoreB: 12,
      expectedVersion: created.version
    }
  });
  assert.equal(scored.statusCode, 200);

  return {
    token,
    id: created.id as string,
    publicToken: created.publicToken as string,
    drew: new Set<string>([...match.teamA, ...match.teamB])
  };
}

test("GET /tournaments/:id reports matchesDrawn for a tied Americano match", async () => {
  await withApp(async (app) => {
    const { token, id, drew } = await tiedEvent(app, "owner-draws-organizer");

    const response = await app.inject({
      method: "GET",
      url: `/tournaments/${id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(response.statusCode, 200);

    const leaderboard: Entry[] = response.json().data.leaderboard;
    assert.ok(leaderboard.length > 0);
    for (const entry of leaderboard) {
      assert.equal(
        entry.matchesDrawn,
        drew.has(entry.playerId) ? 1 : 0,
        `matchesDrawn wrong for ${entry.playerId}`
      );
    }
  });
});

test("GET /public/:token reports matchesDrawn too, so the viewer can derive the same rate", async () => {
  await withApp(async (app) => {
    const { publicToken, drew } = await tiedEvent(app, "owner-draws-public");

    const response = await app.inject({ method: "GET", url: `/public/${publicToken}` });
    assert.equal(response.statusCode, 200);

    const leaderboard: Entry[] = response.json().data.leaderboard;
    assert.ok(leaderboard.length > 0);
    const drawn = leaderboard.filter((entry) => (entry.matchesDrawn ?? 0) > 0);
    assert.equal(drawn.length, 4, "all four players in the tied match");
    for (const entry of drawn) {
      assert.ok(drew.has(entry.playerId));
      assert.equal(entry.matchesDrawn, 1);
    }
  });
});

test("matchesDrawn is present and zero before anything is played", async () => {
  await withApp(async (app) => {
    const token = signUser("owner-draws-fresh");
    const created = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: americanoPayload
    });
    assert.equal(created.statusCode, 200);

    const leaderboard: Entry[] = created.json().data.leaderboard;
    assert.ok(leaderboard.length > 0);
    assert.ok(
      leaderboard.every((entry) => entry.matchesDrawn === 0),
      "a fresh board reports 0, never undefined"
    );
  });
});
