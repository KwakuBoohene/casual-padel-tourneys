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
    await ensureVerifiedUser("koh-rank-owner");
    return await fn(app);
  } finally {
    await app.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
}

const winSet = {
  setNumber: 1,
  gamesA: 6,
  gamesB: 4,
  winMethodsA: ["REGULAR", "REGULAR", "REGULAR", "REGULAR", "REGULAR", "GOLDEN"],
  winMethodsB: ["REGULAR", "REGULAR", "REGULAR", "REGULAR"]
};

async function createAssignedKoh(app: Awaited<ReturnType<typeof createApp>>, token: string) {
  const createResponse = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "KOH Rank Test",
      mode: "KING_OF_THE_HILL",
      courts: 2,
      regularScoring: {
        setFormat: "FULL_SET",
        gameWinBy: 2,
        setsToWin: 1,
        setTiebreakTo: 7
      },
      promotionRules: [{ courtNumber: 2, winsRequired: 2 }]
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
        },
        {
          courtNumber: 2,
          units: [
            { playerA: { name: "C2A" }, playerB: { name: "C2B" } },
            { playerA: { name: "C2C" }, playerB: { name: "C2D" } }
          ]
        }
      ]
    }
  });
  assert.equal(assign.statusCode, 200);
  return assign.json().data;
}

test("GET rankings marks weakest when promotion enabled", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-rank-owner");
    const hub = await createAssignedKoh(app, token);
    const court = hub.courts[0];

    const score = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/courts/${court.id}/score`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        status: "COMPLETE",
        sets: [winSet]
      }
    });
    assert.equal(score.statusCode, 200);

    const rankings = await app.inject({
      method: "GET",
      url: `/koh/tournaments/${hub.id}/rankings?courtNumber=1`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(rankings.statusCode, 200);
    const board = rankings.json().data;
    assert.equal(board.promotionEnabled, true);
    assert.equal(board.rows[0].matchesWon, 1);
    assert.ok(board.rows.some((row: { weakest?: boolean }) => row.weakest === true));
    assert.ok(board.rows[0].specialLosses >= 0);
    assert.equal(board.rows[0].gameDiff, 2);
  });
});

test("replace partner keeps slot and W–L; duplicate name rejected", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-rank-owner");
    const hub = await createAssignedKoh(app, token);
    const court = hub.courts[0];
    const king = court.king;

    await prisma.kohUnit.update({
      where: { id: king.id },
      data: { matchesWon: 2, matchesLost: 1 }
    });

    const dup = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/units/${king.id}/replace-partner`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        leavePlayerId: king.playerBId,
        replacement: { name: "ChalA" }
      }
    });
    assert.equal(dup.statusCode, 400);

    const replaced = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/units/${king.id}/replace-partner`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: hub.version,
        leavePlayerId: king.playerBId,
        replacement: { name: "Peter" }
      }
    });
    assert.equal(replaced.statusCode, 200);
    const next = replaced.json().data;
    assert.equal(next.courts[0].king.id, king.id);
    assert.equal(next.courts[0].king.playerAName, "KingA");
    assert.equal(next.courts[0].king.playerBName, "Peter");
    assert.equal(next.courts[0].king.matchesWon, 2);
    assert.equal(next.courts[0].king.matchesLost, 1);
  });
});

test("replace blocked while draft match in progress", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-rank-owner");
    const hub = await createAssignedKoh(app, token);
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
    const afterDraft = draft.json().data;

    const blocked = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/units/${court.king.id}/replace-partner`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        expectedVersion: afterDraft.version,
        leavePlayerId: court.king.playerBId,
        replacement: { name: "Peter" }
      }
    });
    assert.equal(blocked.statusCode, 400);
  });
});

test("rename KOH player", async () => {
  await withApp(async (app) => {
    const token = signUser("koh-rank-owner");
    const hub = await createAssignedKoh(app, token);
    const king = hub.courts[0].king;

    const renamed = await app.inject({
      method: "POST",
      url: `/koh/tournaments/${hub.id}/players/${king.playerAId}/rename`,
      headers: { authorization: `Bearer ${token}` },
      payload: { expectedVersion: hub.version, newName: "Paul" }
    });
    assert.equal(renamed.statusCode, 200);
    assert.equal(renamed.json().data.courts[0].king.playerAName, "Paul");
  });
});
