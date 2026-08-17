import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { createApp } from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function signUser(id: string): string {
  return jwt.sign(
    { sub: id, email: `${id}@example.com`, name: "Test User", emailVerified: true, isGuest: false },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function ensureUser(id: string): Promise<void> {
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

async function deleteOrganizer(id: string): Promise<void> {
  await prisma.organizerPlayerStatDelta.deleteMany({ where: { organizerId: id } });
  await prisma.organizerPlayer.deleteMany({ where: { organizerId: id } });
  await prisma.tournament.deleteMany({ where: { organizerId: id } });
  await prisma.user.deleteMany({ where: { id } });
}

const amCreate = {
  name: "Delete career night",
  mode: "AMERICANO",
  variant: "CLASSIC",
  schedulingMode: "TARGET_GAMES",
  players: [
    { name: "Ana" },
    { name: "Ben" },
    { name: "Cam" },
    { name: "Dee" },
    { name: "Eve" },
    { name: "Fay" },
    { name: "Gus" },
    { name: "Hal" }
  ],
  courts: 2,
  pointsPerMatch: 24,
  targetGamesPerPlayer: 3
};

async function withApp<T>(
  fn: (app: Awaited<ReturnType<typeof createApp>>, organizerId: string) => Promise<T>
): Promise<T> {
  const organizerId = `career-del-${randomUUID()}`;
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    await ensureUser(organizerId);
    return await fn(app, organizerId);
  } finally {
    await app.close();
    await deleteOrganizer(organizerId);
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
}

async function seedDelta(organizerId: string, tournamentId: string, matchId: string): Promise<void> {
  const player = await prisma.organizerPlayer.create({
    data: { organizerId, name: "Paul", nameNormalized: `paul-${matchId}` }
  });
  await prisma.organizerPlayerStatDelta.create({
    data: {
      organizerId,
      organizerPlayerId: player.id,
      tournamentId,
      tournamentName: "Delete career night",
      matchId,
      tournamentMode: "AMERICANO",
      matchesWon: 1
    }
  });
}

test("DELETE with removeFromCareerLeaderboard=true strips career deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: amCreate
    });
    assert.equal(create.statusCode, 200);
    const tournamentId = create.json().data.id as string;
    await seedDelta(organizerId, tournamentId, "m-strip");

    const deleted = await app.inject({
      method: "DELETE",
      url: `/tournaments/${tournamentId}?removeFromCareerLeaderboard=true`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(deleted.statusCode, 200);
    assert.equal(await prisma.tournament.count({ where: { id: tournamentId } }), 0);
    assert.equal(await prisma.organizerPlayerStatDelta.count({ where: { tournamentId } }), 0);
  });
});

test("DELETE without the flag keeps career deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: amCreate
    });
    assert.equal(create.statusCode, 200);
    const tournamentId = create.json().data.id as string;
    await seedDelta(organizerId, tournamentId, "m-keep");

    const deleted = await app.inject({
      method: "DELETE",
      url: `/tournaments/${tournamentId}`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(deleted.statusCode, 200);
    assert.equal(await prisma.tournament.count({ where: { id: tournamentId } }), 0);
    assert.equal(await prisma.organizerPlayerStatDelta.count({ where: { tournamentId } }), 1);
  });
});

test("DELETE rejects an invalid career flag", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: amCreate
    });
    const tournamentId = create.json().data.id as string;
    const res = await app.inject({
      method: "DELETE",
      url: `/tournaments/${tournamentId}?removeFromCareerLeaderboard=yes`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(await prisma.tournament.count({ where: { id: tournamentId } }), 1);
  });
});
