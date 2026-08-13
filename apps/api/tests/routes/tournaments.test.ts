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

const createPayload = {
  name: "Friday Social",
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
};

async function withApp<T>(fn: (app: Awaited<ReturnType<typeof createApp>>) => Promise<T>): Promise<T> {
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  // Avoid ioredis reconnect storms when Redis is not running in unit tests.
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    await ensureVerifiedUser("owner-1");
    await ensureVerifiedUser("intruder-2");
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

test("create tournament sets organizerId", async () => {
  await withApp(async (app) => {
    const token = signUser("owner-1");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: createPayload
    });

    assert.equal(createResponse.statusCode, 200);
    const created = createResponse.json().data;
    assert.equal(created.organizerId, "owner-1");
    assert.ok(created.id);
    assert.ok(created.publicToken);
  });
});

test("organizer can rename; other user gets 404 on mutate and delete", async () => {
  await withApp(async (app) => {
    const ownerToken = signUser("owner-1");
    const otherToken = signUser("intruder-2");

    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: createPayload
    });
    assert.equal(createResponse.statusCode, 200);
    const created = createResponse.json().data;

    const renameOk = await app.inject({
      method: "POST",
      url: "/tournaments/rename",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { tournamentId: created.id, newName: "Renamed Social" }
    });
    assert.equal(renameOk.statusCode, 200);
    assert.equal(renameOk.json().data.config.name, "Renamed Social");

    const renameDenied = await app.inject({
      method: "POST",
      url: "/tournaments/rename",
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { tournamentId: created.id, newName: "Hijacked" }
    });
    assert.equal(renameDenied.statusCode, 404);

    const scoreDenied = await app.inject({
      method: "POST",
      url: "/tournaments/score",
      headers: { authorization: `Bearer ${otherToken}` },
      payload: {
        tournamentId: created.id,
        matchId: created.rounds[0].matches[0].id,
        scoreA: 12,
        scoreB: 12,
        expectedVersion: created.version
      }
    });
    assert.equal(scoreDenied.statusCode, 404);

    const deleteDenied = await app.inject({
      method: "DELETE",
      url: `/tournaments/${created.id}`,
      headers: { authorization: `Bearer ${otherToken}` }
    });
    assert.equal(deleteDenied.statusCode, 404);

    const deleteOk = await app.inject({
      method: "DELETE",
      url: `/tournaments/${created.id}`,
      headers: { authorization: `Bearer ${ownerToken}` }
    });
    assert.equal(deleteOk.statusCode, 200);
    assert.equal(deleteOk.json().ok, true);
  });
});

test("GET /tournaments/:id requires auth and organizer", async () => {
  await withApp(async (app) => {
    const ownerToken = signUser("owner-1");
    const otherToken = signUser("intruder-2");

    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: createPayload
    });
    const created = createResponse.json().data;

    const unauthed = await app.inject({
      method: "GET",
      url: `/tournaments/${created.id}`
    });
    assert.equal(unauthed.statusCode, 401);

    const ownerGet = await app.inject({
      method: "GET",
      url: `/tournaments/${created.id}`,
      headers: { authorization: `Bearer ${ownerToken}` }
    });
    assert.equal(ownerGet.statusCode, 200);
    assert.equal(ownerGet.json().data.id, created.id);

    const otherGet = await app.inject({
      method: "GET",
      url: `/tournaments/${created.id}`,
      headers: { authorization: `Bearer ${otherToken}` }
    });
    assert.equal(otherGet.statusCode, 404);

    const publicGet = await app.inject({
      method: "GET",
      url: `/public/${created.publicToken}`
    });
    assert.equal(publicGet.statusCode, 200);
    assert.equal(publicGet.json().data.id, created.id);
    assert.equal(publicGet.json().data.organizerId, undefined);
  });
});

test("WebSocket subscribe requires public token or organizer JWT", async () => {
  await withApp(async (app) => {
    const ownerToken = signUser("owner-1");
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: createPayload
    });
    const created = createResponse.json().data;

    const denied = await app.injectWS(`/ws/tournaments/${created.id}`);
    const deniedCode = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("denied WS did not close")), 3000);
      if (denied.readyState === denied.CLOSED) {
        clearTimeout(timer);
        resolve(denied.closeCode ?? 0);
        return;
      }
      denied.on("close", (code: number) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
    assert.equal(deniedCode, 4401);
    denied.terminate();

    const allowed = await app.injectWS(
      `/ws/tournaments/${created.id}?token=${encodeURIComponent(created.publicToken)}`
    );
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("allowed WS closed unexpectedly")), 1000);
      if (allowed.readyState === allowed.OPEN) {
        clearTimeout(timer);
        resolve();
        return;
      }
      allowed.on("open", () => {
        clearTimeout(timer);
        resolve();
      });
      allowed.on("close", () => {
        clearTimeout(timer);
        reject(new Error("allowed WS closed"));
      });
    });
    // Give async auth + subscribe a tick
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(allowed.readyState, allowed.OPEN);
    allowed.terminate();

    const asOrganizer = await app.injectWS(`/ws/tournaments/${created.id}`, {
      headers: { authorization: `Bearer ${ownerToken}` }
    });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(asOrganizer.readyState, asOrganizer.OPEN);
    asOrganizer.terminate();
  });
});
