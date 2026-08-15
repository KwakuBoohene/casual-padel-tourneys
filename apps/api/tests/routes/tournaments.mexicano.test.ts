import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function signUser(id: string): string {
  return jwt.sign(
    { sub: id, email: `${id}@example.com`, name: "Test", emailVerified: true, isGuest: true },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

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

test("POST /tournaments/next-round advances Mexicano ladder after round 1", async () => {
  await withApp(async (app) => {
    const token = signUser("owner-mx-1");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Mexicano API",
        mode: "MEXICANO",
        variant: "CLASSIC",
        schedulingMode: "TOTAL_TIME",
        players: Array.from({ length: 8 }, (_, i) => ({ name: `P${i + 1}` })),
        courts: 2,
        pointsPerMatch: 24
      }
    });
    assert.equal(createResponse.statusCode, 200);
    let tournament = createResponse.json().data;
    assert.equal(tournament.rounds.length, 1);

    for (const match of tournament.rounds[0].matches) {
      const scoreResponse = await app.inject({
        method: "POST",
        url: "/tournaments/score",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          tournamentId: tournament.id,
          matchId: match.id,
          scoreA: 10,
          scoreB: 14,
          expectedVersion: tournament.version
        }
      });
      assert.equal(scoreResponse.statusCode, 200);
      tournament = scoreResponse.json().data;
    }

    const nextResponse = await app.inject({
      method: "POST",
      url: "/tournaments/next-round",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: tournament.id,
        expectedVersion: tournament.version
      }
    });
    assert.equal(nextResponse.statusCode, 200);
    const advanced = nextResponse.json().data;
    assert.equal(advanced.rounds.length, 2);
    assert.equal(advanced.rounds[1].roundNumber, 2);
    assert.equal(advanced.rounds[1].matches.length, 2);

    // Standings after 10–14 on both courts: each player on B has 14, each on A has 10.
    // Ladder still produces two courts of 1+3 vs 2+4 shape.
    const m0 = advanced.rounds[1].matches[0];
    assert.equal(m0.teamA.length, 2);
    assert.equal(m0.teamB.length, 2);
  });
});
