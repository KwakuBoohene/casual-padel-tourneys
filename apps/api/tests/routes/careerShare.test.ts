import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function signUser(id: string, isGuest = false): string {
  return jwt.sign(
    { sub: id, email: `${id}@example.com`, name: "Kwaku Club", emailVerified: true, isGuest },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function withApp<T>(
  fn: (app: Awaited<ReturnType<typeof createApp>>, organizerId: string, token: string) => Promise<T>,
  isGuest = false
): Promise<T> {
  const organizerId = `career-share-${randomUUID()}`;
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    await prisma.user.upsert({
      where: { id: organizerId },
      create: {
        id: organizerId,
        email: `${organizerId}@example.com`,
        name: "Kwaku Club",
        isGuest,
        emailVerifiedAt: new Date()
      },
      update: { emailVerifiedAt: new Date(), isGuest }
    });
    return await fn(app, organizerId, signUser(organizerId, isGuest));
  } finally {
    await app.close();
    await prisma.organizerPlayerStatDelta.deleteMany({ where: { organizerId } });
    await prisma.organizerPlayer.deleteMany({ where: { organizerId } });
    await prisma.tournament.deleteMany({ where: { organizerId } });
    await prisma.user.deleteMany({ where: { id: organizerId } });
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
}

async function enable(app: Awaited<ReturnType<typeof createApp>>, token: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/me/career-share",
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(response.statusCode, 200);
  return response.json().data.token as string;
}

test("share starts off, then enables idempotently", async () => {
  await withApp(async (app, _id, token) => {
    const initial = await app.inject({
      method: "GET",
      url: "/me/career-share",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(initial.json().data.token, null);

    const first = await enable(app, token);
    const second = await enable(app, token);
    assert.equal(second, first, "a live link must not be silently replaced");
  });
});

test("the public board is readable without auth and hides identifiers", async () => {
  await withApp(async (app, organizerId, token) => {
    const share = await enable(app, token);

    const response = await app.inject({ method: "GET", url: `/public/career/${share}` });
    assert.equal(response.statusCode, 200);
    const body = response.json().data;
    assert.equal(body.organizerName, "Kwaku Club");
    assert.equal(body.range, "year");
    assert.ok(Array.isArray(body.rows));
    assert.doesNotMatch(response.body, /organizerId/);
    assert.doesNotMatch(response.body, new RegExp(organizerId));
  });
});

test("rotating kills the previous link immediately", async () => {
  await withApp(async (app, _id, token) => {
    const first = await enable(app, token);
    const rotated = await app.inject({
      method: "POST",
      url: "/me/career-share/rotate",
      headers: { authorization: `Bearer ${token}` }
    });
    const second = rotated.json().data.token as string;
    assert.notEqual(second, first);

    assert.equal((await app.inject({ method: "GET", url: `/public/career/${first}` })).statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url: `/public/career/${second}` })).statusCode, 200);
  });
});

test("revoking makes the link 404 and re-enabling issues a new one", async () => {
  await withApp(async (app, _id, token) => {
    const first = await enable(app, token);
    const revoked = await app.inject({
      method: "DELETE",
      url: "/me/career-share",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(revoked.json().data.token, null);
    assert.equal((await app.inject({ method: "GET", url: `/public/career/${first}` })).statusCode, 404);

    const second = await enable(app, token);
    assert.notEqual(second, first);
  });
});

test("an unknown token is indistinguishable from a revoked one", async () => {
  await withApp(async (app) => {
    const unknown = await app.inject({ method: "GET", url: "/public/career/career_made-up-value" });
    assert.equal(unknown.statusCode, 404);
    assert.match(unknown.json().message, /not found/i);
  });
});

test("the public read honours and validates the range", async () => {
  await withApp(async (app, _id, token) => {
    const share = await enable(app, token);
    const month = await app.inject({ method: "GET", url: `/public/career/${share}?range=month` });
    assert.equal(month.json().data.range, "month");

    const bad = await app.inject({ method: "GET", url: `/public/career/${share}?range=decade` });
    assert.equal(bad.statusCode, 400);
  });
});

test("management requires auth", async () => {
  await withApp(async (app) => {
    assert.equal((await app.inject({ method: "GET", url: "/me/career-share" })).statusCode, 401);
    assert.equal((await app.inject({ method: "POST", url: "/me/career-share" })).statusCode, 401);
  });
});

test("a guest cannot share a board", async () => {
  await withApp(async (app, _id, token) => {
    const response = await app.inject({
      method: "POST",
      url: "/me/career-share",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(response.statusCode, 403);
  }, true);
});
