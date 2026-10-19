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

test("POST /tournaments/end-night voids the incomplete live round", async () => {
  await withApp(async (app) => {
    const token = signUser("owner-mx-end");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Mexicano End",
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

    for (const match of tournament.rounds[0].matches) {
      const scoreResponse = await app.inject({
        method: "POST",
        url: "/tournaments/score",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          tournamentId: tournament.id,
          matchId: match.id,
          scoreA: 12,
          scoreB: 12,
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
    tournament = nextResponse.json().data;
    assert.equal(tournament.rounds.length, 2);

    const endResponse = await app.inject({
      method: "POST",
      url: "/tournaments/end-night",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: tournament.id,
        expectedVersion: tournament.version
      }
    });
    assert.equal(endResponse.statusCode, 200);
    const ended = endResponse.json().data;
    assert.ok(ended.endedAt);
    // The live round is kept and voided rather than discarded.
    assert.equal(ended.rounds.length, 2);
    assert.ok(ended.rounds[1].matches.every((match: { voidedAt?: string }) => match.voidedAt));
    assert.ok(ended.rounds[0].matches.every((match: { voidedAt?: string }) => !match.voidedAt));
  });
});

test("POST /tournaments/:id/close voids unplayed matches and reports the count", async () => {
  await withApp(async (app) => {
    const token = signUser("owner-mx-close");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Mexicano Close",
        mode: "MEXICANO",
        variant: "CLASSIC",
        schedulingMode: "TOTAL_TIME",
        players: Array.from({ length: 8 }, (_, i) => ({ name: `P${i + 1}` })),
        courts: 2,
        pointsPerMatch: 24
      }
    });
    assert.equal(createResponse.statusCode, 200);
    const tournament = createResponse.json().data;
    const totalMatches = tournament.rounds.flatMap(
      (round: { matches: unknown[] }) => round.matches
    ).length;

    const closeResponse = await app.inject({
      method: "POST",
      url: `/tournaments/${tournament.id}/close`,
      headers: { authorization: `Bearer ${token}` },
      payload: { expectedVersion: tournament.version }
    });
    assert.equal(closeResponse.statusCode, 200);
    const closed = closeResponse.json().data;
    assert.equal(closed.voidedMatchCount, totalMatches);
    assert.ok(closed.tournament.endedAt);

    // Closing again is idempotent, not a conflict.
    const again = await app.inject({
      method: "POST",
      url: `/tournaments/${tournament.id}/close`,
      headers: { authorization: `Bearer ${token}` },
      payload: { expectedVersion: closed.tournament.version }
    });
    assert.equal(again.statusCode, 200);
    assert.equal(again.json().data.voidedMatchCount, 0);
  });
});

test("POST /tournaments/:id/close hides another organizer's event as 404", async () => {
  await withApp(async (app) => {
    const ownerToken = signUser("owner-close-owner");
    const strangerToken = signUser("owner-close-stranger");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: "Close Ownership",
        mode: "MEXICANO",
        variant: "CLASSIC",
        schedulingMode: "TOTAL_TIME",
        players: Array.from({ length: 8 }, (_, i) => ({ name: `P${i + 1}` })),
        courts: 2,
        pointsPerMatch: 24
      }
    });
    assert.equal(createResponse.statusCode, 200);
    const tournament = createResponse.json().data;

    const closeResponse = await app.inject({
      method: "POST",
      url: `/tournaments/${tournament.id}/close`,
      headers: { authorization: `Bearer ${strangerToken}` },
      payload: { expectedVersion: tournament.version }
    });
    assert.equal(closeResponse.statusCode, 404);
  });
});
