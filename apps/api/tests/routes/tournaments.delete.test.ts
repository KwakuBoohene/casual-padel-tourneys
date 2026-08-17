import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function signUser(id: string, email = `${id}@example.com`, isGuest = false): string {
  return jwt.sign(
    { sub: id, email, name: "Test User", emailVerified: true, isGuest },
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
    update: { email, emailVerifiedAt: new Date(), isGuest: false }
  });
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

test("DELETE /tournaments removes a King of the Court event", async () => {
  await withApp(async (app) => {
    await ensureVerifiedUser("koh-delete-owner");
    const token = signUser("koh-delete-owner");
    const created = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Delete KOC",
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
    assert.equal(created.statusCode, 200);
    const id = created.json().data.id;

    const listed = await app.inject({
      method: "GET",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(listed.statusCode, 200);
    assert.ok(listed.json().data.some((row: { id: string }) => row.id === id));

    const deleted = await app.inject({
      method: "DELETE",
      url: `/tournaments/${id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(deleted.statusCode, 200);
    assert.equal(deleted.json().ok, true);

    const listedAfter = await app.inject({
      method: "GET",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(listedAfter.statusCode, 200);
    assert.equal(
      listedAfter.json().data.some((row: { id: string }) => row.id === id),
      false
    );

    const missing = await app.inject({
      method: "GET",
      url: `/tournaments/${id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(missing.statusCode, 404);
  });
});

test("DELETE /tournaments still removes an Americano event", async () => {
  await withApp(async (app) => {
    const token = signUser("am-delete-owner", "am-delete-owner@example.com", true);
    const created = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Delete Americano",
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
      }
    });
    assert.equal(created.statusCode, 200);
    const id = created.json().data.id;

    const deleted = await app.inject({
      method: "DELETE",
      url: `/tournaments/${id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(deleted.statusCode, 200);

    const missing = await app.inject({
      method: "GET",
      url: `/tournaments/${id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(missing.statusCode, 404);
  });
});

test("DELETE /tournaments hides another organizer's event as 404", async () => {
  await withApp(async (app) => {
    await ensureVerifiedUser("koh-delete-owner-2");
    await ensureVerifiedUser("koh-delete-intruder");
    const owner = signUser("koh-delete-owner-2");
    const created = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${owner}` },
      payload: {
        name: "Not yours",
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
    assert.equal(created.statusCode, 200);
    const id = created.json().data.id;

    const deleted = await app.inject({
      method: "DELETE",
      url: `/tournaments/${id}`,
      headers: { authorization: `Bearer ${signUser("koh-delete-intruder")}` }
    });
    assert.equal(deleted.statusCode, 404);
  });
});
