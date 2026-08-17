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

async function withApp<T>(fn: (app: Awaited<ReturnType<typeof createApp>>) => Promise<T>): Promise<T> {
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    await ensureVerifiedUser("koh-score-owner");
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

async function createReadyKoh(app: Awaited<ReturnType<typeof createApp>>, token: string) {
  const createResponse = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "KOH Score Test",
      mode: "KING_OF_THE_COURT",
      courts: 1,
      regularScoring: {
        setFormat: "FULL_SET",
        gameWinBy: 2,
        setsToWin: 1,
        setTiebreakTo: 7
      }
    }
  });
  assert.equal(createResponse.statusCode, 200);
  const created = createResponse.json().data;

  const assign = await app.inject({
    method: "PUT",
    url: `/koh/tournaments/${created.id}/assignment`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      courts: [
        {
          courtNumber: 1,
          units: [
            { playerA: { name: "KingA" }, playerB: { name: "KingB" } },
            { playerA: { name: "ChalA" }, playerB: { name: "ChalB" } },
            { playerA: { name: "WaitA" }, playerB: { name: "WaitB" } }
          ]
        }
      ]
    }
  });
  assert.equal(assign.statusCode, 200);
  return assign.json().data;
}

test("draft score does not rotate queue", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-score-owner");
    const hub = await createReadyKoh(app, token);
    const court = hub.courts[0];
    const kingId = court.king.id;
    const challengerId = court.challenger.id;

    const draft = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court.id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        status: "DRAFT",
        sets: [
          {
            setNumber: 1,
            gamesA: 5,
            gamesB: 4,
            winMethodsA: ["REGULAR", "GOLDEN", "REGULAR", "STAR", "REGULAR"]
          }
        ]
      }
    });
    assert.equal(draft.statusCode, 200);
    const after = draft.json().data;
    assert.equal(after.courts[0].king.id, kingId);
    assert.equal(after.courts[0].challenger.id, challengerId);
    assert.ok(after.courts[0].activeMatch);
    assert.equal(after.courts[0].activeMatch.completed, false);
    assert.equal(after.courts[0].activeMatch.sets[0].gamesA, 5);
    assert.equal(after.lastMatchEvent, undefined);
  });
});

test("king loss completes and swaps king", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-score-owner");
    const hub = await createReadyKoh(app, token);
    const court = hub.courts[0];
    const kingId = court.king.id;
    const challengerId = court.challenger.id;
    const waitingId = court.waiting[0].id;

    const complete = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court.id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        status: "COMPLETE",
        sets: [
          {
            setNumber: 1,
            gamesA: 4,
            gamesB: 6,
            winMethodsB: ["REGULAR", "REGULAR", "GOLDEN", "REGULAR", "STAR", "REGULAR"]
          }
        ]
      }
    });
    assert.equal(complete.statusCode, 200);
    const after = complete.json().data;
    assert.equal(after.lastMatchEvent.type, "KING_LOSS");
    assert.equal(after.courts[0].king.id, challengerId);
    assert.equal(after.courts[0].challenger.id, waitingId);
    assert.equal(after.courts[0].waiting.map((u: { id: string }) => u.id).at(-1), kingId);
    assert.equal(after.courts[0].activeMatch, null);

    const get = await app.inject({
      method: "GET",
      url: `/koh/tournaments/${hub.id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(get.statusCode, 200);
    assert.equal(get.json().data.courts[0].king.id, challengerId);
  });
});

test("version conflict returns 409", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-score-owner");
    const hub = await createReadyKoh(app, token);
    const court = hub.courts[0];

    const response = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court.id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version - 1,
        status: "DRAFT",
        sets: [{ setNumber: 1, gamesA: 1, gamesB: 0 }]
      }
    });
    assert.equal(response.statusCode, 409);
  });
});

test("incomplete COMPLETE body is rejected", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-score-owner");
    const hub = await createReadyKoh(app, token);
    const court = hub.courts[0];

    const response = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court.id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        status: "COMPLETE",
        sets: [{ setNumber: 1, gamesA: 5, gamesB: 4 }]
      }
    });
    assert.equal(response.statusCode, 400);
  });
});
