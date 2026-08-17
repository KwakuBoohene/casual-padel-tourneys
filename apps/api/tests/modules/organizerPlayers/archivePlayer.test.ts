import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { createApp } from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function signUser(id: string, isGuest = false): string {
  return jwt.sign(
    {
      sub: id,
      email: `${id}@example.com`,
      name: "Test User",
      emailVerified: true,
      isGuest
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function ensureUser(id: string, isGuest = false): Promise<void> {
  await prisma.user.upsert({
    where: { id },
    create: {
      id,
      email: `${id}@example.com`,
      name: "Test User",
      isGuest,
      emailVerifiedAt: isGuest ? null : new Date()
    },
    update: { emailVerifiedAt: isGuest ? null : new Date(), isGuest }
  });
}

async function deleteOrganizer(id: string): Promise<void> {
  await prisma.organizerPlayerStatDelta.deleteMany({ where: { organizerId: id } });
  await prisma.organizerPlayer.deleteMany({ where: { organizerId: id } });
  await prisma.tournament.deleteMany({ where: { organizerId: id } });
  await prisma.user.deleteMany({ where: { id } });
}

async function withApp<T>(
  fn: (app: Awaited<ReturnType<typeof createApp>>, organizerId: string) => Promise<T>
): Promise<T> {
  const organizerId = `career-manage-${randomUUID()}`;
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

async function seedPlayer(
  organizerId: string,
  name: string,
  matchesWon: number,
  matchId: string
): Promise<string> {
  const player = await prisma.organizerPlayer.create({
    data: {
      organizerId,
      name,
      nameNormalized: name.trim().toLowerCase()
    }
  });
  await prisma.organizerPlayerStatDelta.create({
    data: {
      organizerId,
      organizerPlayerId: player.id,
      tournamentId: `t-${matchId}`,
      tournamentName: "Club night",
      matchId,
      tournamentMode: "KING_OF_THE_COURT",
      matchesWon,
      matchesLost: 0
    }
  });
  return player.id;
}

test("archive hides from leaderboard and frees the name; unarchive suffixes", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const paulId = await seedPlayer(organizerId, "Paul", 5, "m-paul-1");

    const archived = await app.inject({
      method: "POST",
      url: `/me/players/${paulId}/archive`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(archived.statusCode, 200);

    const board = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard?range=all",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(board.json().data.rows.length, 0);

    const again = await prisma.organizerPlayer.create({
      data: { organizerId, name: "Paul", nameNormalized: "paul" }
    });
    assert.notEqual(again.id, paulId);

    const managed = await app.inject({
      method: "GET",
      url: "/me/players?status=archived",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(managed.statusCode, 200);
    const archivedRow = managed.json().data.players[0] as { suggestedRestoreName: string };
    assert.equal(archivedRow.suggestedRestoreName, "Paul (unarchived)");

    const restored = await app.inject({
      method: "POST",
      url: `/me/players/${paulId}/unarchive`,
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(restored.statusCode, 200);
    assert.equal(restored.json().data.name, "Paul (unarchived)");

    const suggestions = await app.inject({
      method: "GET",
      url: "/players/suggestions",
      headers: { authorization: `Bearer ${token}` }
    });
    const names = suggestions.json().names as string[];
    assert.ok(names.includes("Paul (unarchived)"));
    assert.ok(names.includes("Paul"));
  });
});

test("guest cannot archive a career identity", async () => {
  await withApp(async (app, organizerId) => {
    const guestId = `guest-${randomUUID()}`;
    await ensureUser(guestId, true);
    try {
      const paulId = await seedPlayer(organizerId, "Paul", 1, "m-guest");
      const res = await app.inject({
        method: "POST",
        url: `/me/players/${paulId}/archive`,
        headers: { authorization: `Bearer ${signUser(guestId, true)}` }
      });
      assert.equal(res.statusCode, 403);
    } finally {
      await deleteOrganizer(guestId);
    }
  });
});

test("merge combines disjoint careers and archives the sources", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const aId = await seedPlayer(organizerId, "Paul", 5, "m-a");
    const bId = await seedPlayer(organizerId, "Paul A.", 2, "m-b");

    const merged = await app.inject({
      method: "POST",
      url: "/me/players/merge",
      headers: { authorization: `Bearer ${token}` },
      payload: { playerIdA: aId, playerIdB: bId, survivingName: "Paul" }
    });
    assert.equal(merged.statusCode, 200);
    const newId = merged.json().data.id as string;
    assert.notEqual(newId, aId);
    assert.notEqual(newId, bId);

    const board = await app.inject({
      method: "GET",
      url: "/me/players/leaderboard?range=all",
      headers: { authorization: `Bearer ${token}` }
    });
    const rows = board.json().data.rows as Array<{ id: string; name: string; matchesWon: number }>;
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, newId);
    assert.equal(rows[0]?.name, "Paul");
    assert.equal(rows[0]?.matchesWon, 7);
  });
});

test("merge rejects careers that share a match", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const aId = await seedPlayer(organizerId, "Ada", 1, "same-match");
    const bId = await seedPlayer(organizerId, "Bea", 1, "same-match");
    const res = await app.inject({
      method: "POST",
      url: "/me/players/merge",
      headers: { authorization: `Bearer ${token}` },
      payload: { playerIdA: aId, playerIdB: bId, survivingName: "Ada" }
    });
    assert.equal(res.statusCode, 400);
  });
});
