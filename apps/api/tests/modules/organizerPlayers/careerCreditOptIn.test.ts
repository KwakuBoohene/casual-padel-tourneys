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

async function withApp<T>(
  fn: (app: Awaited<ReturnType<typeof createApp>>, organizerId: string) => Promise<T>
): Promise<T> {
  const organizerId = `career-optin-${randomUUID()}`;
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

const winSet = {
  setNumber: 1,
  gamesA: 6,
  gamesB: 4,
  winMethodsA: ["REGULAR", "REGULAR", "REGULAR", "REGULAR", "REGULAR", "REGULAR"],
  winMethodsB: ["REGULAR", "REGULAR", "REGULAR", "REGULAR"]
};

const kohCreate = {
  name: "Opt-in KOH",
  mode: "KING_OF_THE_COURT",
  courts: 1,
  regularScoring: {
    setFormat: "FULL_SET",
    gameWinBy: 2,
    setsToWin: 1,
    setTiebreakTo: 7
  }
};

const amCreate = {
  name: "Opt-in Americano",
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

async function completeKohMatch(
  app: Awaited<ReturnType<typeof createApp>>,
  token: string,
  contributeToCareerLeaderboard: boolean
): Promise<string> {
  const create = await app.inject({
    method: "POST",
    url: "/tournaments",
    headers: { authorization: `Bearer ${token}` },
    payload: { ...kohCreate, contributeToCareerLeaderboard }
  });
  assert.equal(create.statusCode, 200);
  const created = create.json().data;
  assert.equal(created.config.contributeToCareerLeaderboard, contributeToCareerLeaderboard);

  const assign = await app.inject({
    method: "PUT",
    url: `/koh/tournaments/${created.id}/assignment`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      courts: [
        {
          courtNumber: 1,
          units: [
            { playerA: { name: "Paul" }, playerB: { name: "George" } },
            { playerA: { name: "Sam" }, playerB: { name: "Jordan" } }
          ]
        }
      ]
    }
  });
  assert.equal(assign.statusCode, 200);
  const hub = assign.json().data;
  const court = hub.courts[0];
  const score = await app.inject({
    method: "POST",
    url: `/koh/tournaments/${created.id}/courts/${court.id}/score`,
    headers: { authorization: `Bearer ${token}` },
    payload: { expectedVersion: hub.version, status: "COMPLETE", sets: [winSet] }
  });
  assert.equal(score.statusCode, 200);
  return created.id;
}

test("KOH create omits flag and defaults contributeToCareerLeaderboard true", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: kohCreate
    });
    assert.equal(create.statusCode, 200);
    assert.equal(create.json().data.config.contributeToCareerLeaderboard, true);
  });
});

test("KOH complete with contribute false writes zero career deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    await completeKohMatch(app, token, false);
    const count = await prisma.organizerPlayerStatDelta.count({ where: { organizerId } });
    assert.equal(count, 0);
  });
});

test("KOH complete with contribute true writes four career deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    await completeKohMatch(app, token, true);
    const count = await prisma.organizerPlayerStatDelta.count({ where: { organizerId } });
    assert.equal(count, 4);
  });
});

test("Americano complete with contribute false writes zero career deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...amCreate, contributeToCareerLeaderboard: false }
    });
    assert.equal(create.statusCode, 200);
    const created = create.json().data;
    assert.equal(created.config.contributeToCareerLeaderboard, false);
    const match = created.rounds[0].matches[0];
    const score = await app.inject({
      method: "POST",
      url: "/tournaments/score",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: created.id,
        matchId: match.id,
        scoreA: 16,
        scoreB: 8,
        expectedVersion: created.version
      }
    });
    assert.equal(score.statusCode, 200);
    const count = await prisma.organizerPlayerStatDelta.count({ where: { organizerId } });
    assert.equal(count, 0);
  });
});

test("Americano complete with contribute true writes four career deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...amCreate, contributeToCareerLeaderboard: true }
    });
    assert.equal(create.statusCode, 200);
    const created = create.json().data;
    const match = created.rounds[0].matches[0];
    const score = await app.inject({
      method: "POST",
      url: "/tournaments/score",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: created.id,
        matchId: match.id,
        scoreA: 16,
        scoreB: 8,
        expectedVersion: created.version
      }
    });
    assert.equal(score.statusCode, 200);
    const count = await prisma.organizerPlayerStatDelta.count({ where: { organizerId } });
    assert.equal(count, 4);
  });
});

test("Americano can opt in after scoring and backfills four deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...amCreate, contributeToCareerLeaderboard: false }
    });
    assert.equal(create.statusCode, 200);
    const created = create.json().data;
    const match = created.rounds[0].matches[0];
    const score = await app.inject({
      method: "POST",
      url: "/tournaments/score",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: created.id,
        matchId: match.id,
        scoreA: 16,
        scoreB: 8,
        expectedVersion: created.version
      }
    });
    assert.equal(score.statusCode, 200);
    const optIn = await app.inject({
      method: "POST",
      url: "/tournaments/career-leaderboard",
      headers: { authorization: `Bearer ${token}` },
      payload: { tournamentId: created.id, contributeToCareerLeaderboard: true }
    });
    assert.equal(optIn.statusCode, 200);
    assert.equal(optIn.json().data.config.contributeToCareerLeaderboard, true);
    const count = await prisma.organizerPlayerStatDelta.count({ where: { organizerId } });
    assert.equal(count, 4);
  });
});

test("Americano can opt out after scoring and removes career deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const create = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...amCreate, contributeToCareerLeaderboard: true }
    });
    assert.equal(create.statusCode, 200);
    const created = create.json().data;
    const match = created.rounds[0].matches[0];
    const score = await app.inject({
      method: "POST",
      url: "/tournaments/score",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tournamentId: created.id,
        matchId: match.id,
        scoreA: 16,
        scoreB: 8,
        expectedVersion: created.version
      }
    });
    assert.equal(score.statusCode, 200);
    const optOut = await app.inject({
      method: "POST",
      url: "/tournaments/career-leaderboard",
      headers: { authorization: `Bearer ${token}` },
      payload: { tournamentId: created.id, contributeToCareerLeaderboard: false }
    });
    assert.equal(optOut.statusCode, 200);
    assert.equal(optOut.json().data.config.contributeToCareerLeaderboard, false);
    const count = await prisma.organizerPlayerStatDelta.count({ where: { organizerId } });
    assert.equal(count, 0);
  });
});

test("KOH can opt out after scoring and removes career deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const tournamentId = await completeKohMatch(app, token, true);
    const optOut = await app.inject({
      method: "POST",
      url: "/tournaments/career-leaderboard",
      headers: { authorization: `Bearer ${token}` },
      payload: { tournamentId, contributeToCareerLeaderboard: false }
    });
    assert.equal(optOut.statusCode, 200);
    assert.equal(optOut.json().data.config.contributeToCareerLeaderboard, false);
    const count = await prisma.organizerPlayerStatDelta.count({ where: { organizerId } });
    assert.equal(count, 0);
  });
});

test("KOH can opt in after scoring and backfills four deltas", async () => {
  await withApp(async (app, organizerId) => {
    const token = signUser(organizerId);
    const tournamentId = await completeKohMatch(app, token, false);
    const optIn = await app.inject({
      method: "POST",
      url: "/tournaments/career-leaderboard",
      headers: { authorization: `Bearer ${token}` },
      payload: { tournamentId, contributeToCareerLeaderboard: true }
    });
    assert.equal(optIn.statusCode, 200);
    assert.equal(optIn.json().data.config.contributeToCareerLeaderboard, true);
    const count = await prisma.organizerPlayerStatDelta.count({ where: { organizerId } });
    assert.equal(count, 4);
  });
});
