import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function signUser(id: string, email = `${id}@example.com`): string {
  return jwt.sign(
    { sub: id, email, name: "Test User", emailVerified: true, isGuest: false },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function ensureVerifiedUser(id: string): Promise<void> {
  await prisma.user.upsert({
    where: { id },
    create: {
      id,
      email: `${id}@example.com`,
      name: "Test User",
      isGuest: false,
      emailVerifiedAt: new Date()
    },
    update: { emailVerifiedAt: new Date(), isGuest: false }
  });
}

async function withApp<T>(fn: (app: Awaited<ReturnType<typeof createApp>>) => Promise<T>): Promise<T> {
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    await ensureVerifiedUser("koh-public-owner");
    return await fn(app);
  } finally {
    await app.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
}

test("GET /public/:token returns KOH hub for spectator", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-public-owner");
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Public KOH",
        mode: "KING_OF_THE_HILL",
        courts: 1,
        regularScoring: {
          setFormat: "FULL_SET",
          gameWinBy: 2,
          setsToWin: 1,
          setTiebreakTo: 7
        }
      }
    });
    assert.equal(create.statusCode, 200);
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
              { playerA: { name: "Alex" }, playerB: { name: "Sam" } },
              { playerA: { name: "Jordan" }, playerB: { name: "Lee" } }
            ]
          }
        ]
      }
    });
    assert.equal(assign.statusCode, 200);

    const pub = await app.inject({
      method: "GET",
      url: `/public/${created.publicToken}`
    });
    assert.equal(pub.statusCode, 200);
    const data = pub.json().data;
    assert.equal(data.config.mode, "KING_OF_THE_HILL");
    assert.equal(data.courts[0].king.playerAName, "Alex");
    assert.equal(data.courts[0].challenger.playerAName, "Jordan");
    assert.equal(data.organizerId, undefined);

    const score = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${created.id}/courts/${data.courts[0].id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: assign.json().data.version,
        status: "COMPLETE",
        sets: [
          {
            setNumber: 1,
            gamesA: 6,
            gamesB: 4,
            winMethodsA: ["REGULAR", "REGULAR", "REGULAR", "REGULAR", "REGULAR", "GOLDEN"],
            winMethodsB: ["REGULAR", "REGULAR", "REGULAR", "REGULAR"]
          }
        ]
      }
    });
    assert.equal(score.statusCode, 200);

    const after = await app.inject({
      method: "GET",
      url: `/public/${created.publicToken}`
    });
    assert.equal(after.statusCode, 200);
    const last = after.json().data.courts[0].lastResult;
    assert.ok(last);
    assert.equal(last.gamesA, 6);
    assert.equal(last.gamesB, 4);
    assert.equal(last.specialLabel, "Golden");

    const rankings = await app.inject({
      method: "GET",
      url: `/public/${created.publicToken}/rankings?courtNumber=1`
    });
    assert.equal(rankings.statusCode, 200);
    assert.ok(rankings.json().data.rows.length >= 2);
  });
});
