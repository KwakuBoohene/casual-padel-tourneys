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
    await ensureVerifiedUser("koh-swap-owner");
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

const winSet = {
  setNumber: 1,
  gamesA: 6,
  gamesB: 4,
  winMethodsA: ["REGULAR", "REGULAR", "REGULAR", "REGULAR", "REGULAR", "REGULAR"]
};

async function createSingleCourtKoh(app: Awaited<ReturnType<typeof createApp>>, token: string) {
  const createResponse = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "KOH Swap Test",
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

async function createTwoCourtKoh(app: Awaited<ReturnType<typeof createApp>>, token: string) {
  const createResponse = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "KOH Promo Test",
      mode: "KING_OF_THE_COURT",
      courts: 2,
      regularScoring: {
        setFormat: "FULL_SET",
        gameWinBy: 2,
        setsToWin: 1,
        setTiebreakTo: 7
      },
      promotionRules: [{ courtNumber: 2, winsRequired: 1 }]
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
            { playerA: { name: "TopA" }, playerB: { name: "TopB" } },
            { playerA: { name: "WeakA" }, playerB: { name: "WeakB" } }
          ]
        },
        {
          courtNumber: 2,
          units: [
            { playerA: { name: "ClimbA" }, playerB: { name: "ClimbB" } },
            { playerA: { name: "LowA" }, playerB: { name: "LowB" } }
          ]
        }
      ]
    }
  });
  assert.equal(assign.statusCode, 200);
  return assign.json().data;
}

test("temp king swap restores after completed king win", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-swap-owner");
    const hub = await createSingleCourtKoh(app, token);
    const court = hub.courts[0];
    const originalKingId = court.king.id;
    const waitingId = court.waiting[0].id;

    const swap = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court.id}/swap`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        slot: "KING",
        withUnitId: waitingId,
        reason: "Filling in briefly"
      }
    });
    assert.equal(swap.statusCode, 200);
    const swapped = swap.json().data;
    assert.equal(swapped.courts[0].king.id, waitingId);
    assert.equal(swapped.courts[0].tempSwap.slot, "KING");
    assert.equal(swapped.courts[0].tempSwap.inUnitId, waitingId);
    assert.equal(swapped.courts[0].tempSwap.outUnitId, originalKingId);

    const complete = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court.id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: swapped.version,
        status: "COMPLETE",
        sets: [winSet]
      }
    });
    assert.equal(complete.statusCode, 200);
    const after = complete.json().data;
    assert.equal(after.courts[0].king.id, originalKingId);
    assert.equal(after.courts[0].tempSwap, null);
  });
});

test("swap blocked while draft match in progress", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-swap-owner");
    const hub = await createSingleCourtKoh(app, token);
    const court = hub.courts[0];

    const draft = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court.id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        status: "DRAFT",
        sets: [{ setNumber: 1, gamesA: 3, gamesB: 2 }]
      }
    });
    assert.equal(draft.statusCode, 200);

    const swap = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court.id}/swap`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: draft.json().data.version,
        slot: "CHALLENGER",
        withUnitId: court.waiting[0].id,
        reason: "Should fail"
      }
    });
    assert.equal(swap.statusCode, 400);
    assert.match(swap.json().message, /in progress/i);
  });
});

test("auto-promo emits court change with both unit ids", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-swap-owner");
    const hub = await createTwoCourtKoh(app, token);
    const court2 = hub.courts.find((c: { courtNumber: number }) => c.courtNumber === 2);
    assert.ok(court2);
    const climberId = court2.king.id;
    const weakId = hub.courts.find((c: { courtNumber: number }) => c.courtNumber === 1).challenger.id;

    // Seed W–L so court 1 challenger is clearly weakest
    await prisma.kohUnit.update({
      where: { id: weakId },
      data: { matchesWon: 0, matchesLost: 3 }
    });
    await prisma.kohUnit.update({
      where: { id: hub.courts[0].king.id },
      data: { matchesWon: 3, matchesLost: 0 }
    });

    const complete = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court2.id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        status: "COMPLETE",
        sets: [winSet]
      }
    });
    assert.equal(complete.statusCode, 200);
    const after = complete.json().data;
    assert.ok(after.lastCourtChange);
    assert.equal(after.lastCourtChange.type, "PROMOTED");
    assert.equal(after.lastCourtChange.promotedUnitId, climberId);
    assert.equal(after.lastCourtChange.demotedUnitId, weakId);
    assert.equal(after.lastCourtChange.fromCourtNumber, 2);
    assert.equal(after.lastCourtChange.toCourtNumber, 1);

    const upper = after.courts.find((c: { courtNumber: number }) => c.courtNumber === 1);
    const lower = after.courts.find((c: { courtNumber: number }) => c.courtNumber === 2);
    assert.ok(upper.waiting.some((u: { id: string }) => u.id === climberId) || upper.king?.id === climberId || upper.challenger?.id === climberId);
    assert.ok(
      lower.waiting.some((u: { id: string }) => u.id === weakId) ||
        lower.king?.id === weakId ||
        lower.challenger?.id === weakId
    );
  });
});

test("tied weakest returns pick-required then promote/pick applies", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-swap-owner");
    const hub = await createTwoCourtKoh(app, token);
    const court1 = hub.courts.find((c: { courtNumber: number }) => c.courtNumber === 1);
    const court2 = hub.courts.find((c: { courtNumber: number }) => c.courtNumber === 2);
    assert.ok(court1 && court2);

    await prisma.kohUnit.update({
      where: { id: court1.king.id },
      data: { matchesWon: 1, matchesLost: 2 }
    });
    await prisma.kohUnit.update({
      where: { id: court1.challenger.id },
      data: { matchesWon: 1, matchesLost: 2 }
    });

    const complete = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court2.id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        status: "COMPLETE",
        sets: [winSet]
      }
    });
    assert.equal(complete.statusCode, 200);
    const pendingHub = complete.json().data;
    assert.equal(pendingHub.lastCourtChange.type, "NEEDS_ORGANIZER_PICK");
    assert.ok(pendingHub.pendingPromote);
    assert.equal(pendingHub.pendingPromote.promotedUnitId, court2.king.id);
    assert.deepEqual(
      [...pendingHub.pendingPromote.candidateUnitIds].sort(),
      [court1.king.id, court1.challenger.id].sort()
    );

    const pick = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/promote/pick`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: pendingHub.version,
        demotedUnitId: court1.challenger.id
      }
    });
    assert.equal(pick.statusCode, 200);
    const picked = pick.json().data;
    assert.equal(picked.lastCourtChange.type, "PROMOTED");
    assert.equal(picked.lastCourtChange.demotedUnitId, court1.challenger.id);
    assert.equal(picked.lastCourtChange.promotedUnitId, court2.king.id);
    assert.equal(picked.pendingPromote, null);
  });
});

test("swap requires reason", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-swap-owner");
    const hub = await createSingleCourtKoh(app, token);
    const court = hub.courts[0];
    const swap = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court.id}/swap`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        slot: "KING",
        withUnitId: court.waiting[0].id,
        reason: ""
      }
    });
    assert.equal(swap.statusCode, 400);
    assert.ok(swap.json().errors);
  });
});
