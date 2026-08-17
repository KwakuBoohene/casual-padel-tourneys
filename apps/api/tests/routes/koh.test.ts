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

async function ensureVerifiedUser(id: string, email = `${id}@example.com`): Promise<void> {
  await prisma.user.upsert({
    where: { id },
    create: {
      id,
      email,
      name: "Test User",
      isGuest: false,
      emailVerifiedAt: new Date()
    },
    update: {
      email,
      emailVerifiedAt: new Date(),
      isGuest: false
    }
  });
}

const kohCreatePayload = {
  name: "KOH Friday",
  mode: "KING_OF_THE_COURT" as const,
  courts: 2,
  regularScoring: {
    setFormat: "FULL_SET" as const,
    gameWinBy: 2 as const,
    setsToWin: 1,
    setTiebreakTo: 7 as const
  },
  promotionRules: [{ courtNumber: 2, winsRequired: 3 }]
};

async function withApp<T>(fn: (app: Awaited<ReturnType<typeof createApp>>) => Promise<T>): Promise<T> {
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    await ensureVerifiedUser("koh-owner-1");
    await ensureVerifiedUser("koh-intruder-2");
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

test("POST /tournaments creates KOH without AM rounds", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-owner-1");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: kohCreatePayload
    });
    assert.equal(createResponse.statusCode, 200);
    const created = createResponse.json().data;
    assert.equal(created.config.mode, "KING_OF_THE_COURT");
    assert.equal(created.config.pairingMode, "WINNER_STAYS");
    assert.equal(created.courts.length, 2);
    assert.equal(created.ready, false);
    assert.equal(created.rounds, undefined);
    assert.ok(created.id);
    assert.ok(created.publicToken);

    const row = await prisma.tournament.findUnique({ where: { id: created.id } });
    assert.equal(row?.mode, "KING_OF_THE_COURT");
    assert.equal(row?.pairingMode, "WINNER_STAYS");
  });
});

test("AM create still returns generated rounds", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-owner-1");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "AM Control",
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
        pointsPerMatch: 24,
        targetGamesPerPlayer: 3
      }
    });
    assert.equal(createResponse.statusCode, 200);
    const created = createResponse.json().data;
    assert.equal(created.config.mode, "AMERICANO");
    assert.ok(created.rounds.length >= 1);
    assert.ok(created.rounds[0].matches.length >= 1);
  });
});

test("assign pairs then GET hub shows king / next / waiting", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-owner-1");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: kohCreatePayload
    });
    assert.equal(createResponse.statusCode, 200);
    const created = createResponse.json().data;

    const assignResponse = await app.inject({
      method: "PUT",
      url: `/koh/tournaments/${created.id}/assignment`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        courts: [
          {
            courtNumber: 1,
            units: [
              { playerA: { name: "Alex" }, playerB: { name: "Sam" } },
              { playerA: { name: "Jordan" }, playerB: { name: "Taylor" } },
              { playerA: { name: "Casey" }, playerB: { name: "Riley" } }
            ]
          },
          {
            courtNumber: 2,
            units: [
              { playerA: { name: "Morgan" }, playerB: { name: "Quinn" } },
              { playerA: { name: "Avery" }, playerB: { name: "Blake" } }
            ]
          }
        ]
      }
    });
    assert.equal(assignResponse.statusCode, 200);
    const assigned = assignResponse.json().data;
    assert.equal(assigned.ready, true);
    assert.equal(assigned.balanceHint, null);

    const court1 = assigned.courts.find((c: { courtNumber: number }) => c.courtNumber === 1);
    assert.ok(court1);
    assert.equal(court1.king.playerAName, "Alex");
    assert.equal(court1.challenger.playerAName, "Jordan");
    assert.equal(court1.waiting.length, 1);
    assert.equal(court1.waiting[0].playerAName, "Casey");

    const getResponse = await app.inject({
      method: "GET",
      url: `/koh/tournaments/${created.id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(getResponse.statusCode, 200);
    assert.equal(getResponse.json().data.courts[0].king.playerAName, "Alex");

    const viaTournaments = await app.inject({
      method: "GET",
      url: `/tournaments/${created.id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(viaTournaments.statusCode, 200);
    assert.equal(viaTournaments.json().data.config.mode, "KING_OF_THE_COURT");
  });
});

test("randomize and reorder queue; reject single-unit court", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-owner-1");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "KOH One Court",
        mode: "KING_OF_THE_COURT",
        courts: 1,
        regularScoring: kohCreatePayload.regularScoring
      }
    });
    const id = createResponse.json().data.id;

    const badAssign = await app.inject({
      method: "PUT",
      url: `/koh/tournaments/${id}/assignment`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        courts: [
          {
            courtNumber: 1,
            units: [{ playerA: { name: "Only" }, playerB: { name: "Pair" } }]
          }
        ]
      }
    });
    assert.equal(badAssign.statusCode, 400);

    const assign = await app.inject({
      method: "PUT",
      url: `/koh/tournaments/${id}/assignment`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        courts: [
          {
            courtNumber: 1,
            units: [
              { playerA: { name: "A1" }, playerB: { name: "A2" } },
              { playerA: { name: "B1" }, playerB: { name: "B2" } },
              { playerA: { name: "C1" }, playerB: { name: "C2" } }
            ]
          }
        ]
      }
    });
    assert.equal(assign.statusCode, 200);
    const before = assign.json().data.courts[0];
    const unitIds = [before.king.id, before.challenger.id, ...before.waiting.map((u: { id: string }) => u.id)];

    const reorder = await app.inject({
      method: "PUT",
      url: `/koh/tournaments/${id}/courts/1/queue`,
      headers: { authorization: `Bearer ${token}` },
      payload: { unitIds: [unitIds[2], unitIds[0], unitIds[1]] }
    });
    assert.equal(reorder.statusCode, 200);
    assert.equal(reorder.json().data.courts[0].king.id, unitIds[2]);

    const randomize = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${id}/courts/1/randomize`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(randomize.statusCode, 200);
    assert.equal(randomize.json().data.courts[0].unitCount, 3);

    const denied = await app.inject({
      method: "GET",
      url: `/koh/tournaments/${id}`,
      headers: { authorization: `Bearer ${signUser("koh-intruder-2")}` }
    });
    assert.equal(denied.statusCode, 404);
  });
});
