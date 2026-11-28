import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";
const RUN = Date.now().toString(36);
type App = Awaited<ReturnType<typeof createApp>>;
type Headers = Record<string, string>;

async function verifiedUser(prefix: string): Promise<{ id: string; auth: Headers }> {
  const id = `${prefix}-${RUN}`;
  await prisma.user.upsert({
    where: { id },
    create: { id, email: `${id}@example.com`, name: `User ${id}`, isGuest: false, emailVerifiedAt: new Date() },
    update: { emailVerifiedAt: new Date(), isGuest: false }
  });
  const token = jwt.sign(
    { sub: id, email: `${id}@example.com`, name: `User ${id}`, emailVerified: true, isGuest: false },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  return { id, auth: { authorization: `Bearer ${token}` } };
}

async function withApp<T>(fn: (app: App) => Promise<T>): Promise<T> {
  const saved = { JWT_SECRET: process.env.JWT_SECRET, REDIS_URL: process.env.REDIS_URL };
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    return await fn(app);
  } finally {
    await app.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const players = (count: number) => Array.from({ length: count }, (_, index) => ({ name: `Player ${index + 1}` }));
const AMERICANO = {
  name: "Draft Americano",
  mode: "AMERICANO",
  variant: "CLASSIC",
  schedulingMode: "TARGET_GAMES",
  players: players(8),
  courts: 2,
  pointsPerMatch: 24,
  targetGamesPerPlayer: 3
};
const pair = (a: string, b: string) => ({ playerA: { name: a }, playerB: { name: b } });
const KOH = {
  name: "Draft KOTC",
  mode: "KING_OF_THE_COURT",
  courts: 1,
  regularScoring: { setFormat: "FULL_SET", gameWinBy: 2, setsToWin: 1, setTiebreakTo: 7 },
  courtAssignments: [{ courtNumber: 1, units: [pair("Alex", "Sam"), pair("Jordan", "Taylor"), pair("Kwaku", "Ama")] }]
};

async function saveDraft(app: App, auth: Headers, payload: unknown) {
  const response = await app.inject({ method: "POST", url: "/drafts", headers: auth, payload: { payload } });
  assert.equal(response.statusCode, 201, response.body);
  return response.json().data as { id: string; version: number };
}

const start = (app: App, auth: Headers, id: string, expectedVersion: number) =>
  app.inject({ method: "POST", url: `/drafts/${id}/start`, headers: auth, payload: { expectedVersion } });

const tournamentCount = (organizerId: string) => prisma.tournament.count({ where: { organizerId } });

test("starting an Americano draft equals a direct create", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("start-am");
    const draft = await saveDraft(app, owner.auth, AMERICANO);
    const started = await start(app, owner.auth, draft.id, 0);
    assert.equal(started.statusCode, 200, started.body);
    assert.equal(started.json().alreadyStarted, false);
    const fromDraft = started.json().data;

    const direct = await app.inject({ method: "POST", url: "/tournaments", headers: owner.auth, payload: AMERICANO });
    assert.equal(direct.statusCode, 200, direct.body);
    const created = direct.json().data;
    assert.deepEqual(fromDraft.config, created.config);
    assert.equal(fromDraft.players.length, created.players.length);
    assert.equal(fromDraft.rounds.length, created.rounds.length);

    const reloaded = await app.inject({ method: "GET", url: `/drafts/${draft.id}`, headers: owner.auth });
    assert.equal(reloaded.json().data.startedTournamentId, fromDraft.id);
    const list = await app.inject({ method: "GET", url: "/drafts", headers: owner.auth });
    assert.equal(list.json().data.some((row: { id: string }) => row.id === draft.id), false);
    const live = await app.inject({ method: "GET", url: `/tournaments/${fromDraft.id}`, headers: owner.auth });
    assert.equal(live.statusCode, 200);
  });
});

test("starting a King of the Court draft creates and assigns courts", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("start-koh");
    const draft = await saveDraft(app, owner.auth, KOH);
    const started = await start(app, owner.auth, draft.id, 0);
    assert.equal(started.statusCode, 200, started.body);
    const hub = started.json().data;
    assert.equal(hub.config.mode, "KING_OF_THE_COURT");
    assert.equal(hub.ready, true);
    assert.equal(hub.players.length, 6);
    const live = await app.inject({ method: "GET", url: `/tournaments/${hub.id}`, headers: owner.auth });
    assert.equal(live.statusCode, 200, live.body);
  });
});

test("a draft that is not ready is rejected without creating anything", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("start-not-ready");
    const draft = await saveDraft(app, owner.auth, { ...AMERICANO, players: players(3) });
    const before = await tournamentCount(owner.id);
    const response = await start(app, owner.auth, draft.id, 0);
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "DRAFT_NOT_READY");
    assert.equal(response.json().message, "Add 1 more player to start");
    assert.equal(response.json().readiness.ready, false);
    assert.equal(await tournamentCount(owner.id), before);
  });
});

test("a stale version cannot start the draft", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("start-stale");
    const draft = await saveDraft(app, owner.auth, AMERICANO);
    const edit = await app.inject({ method: "PATCH", url: `/drafts/${draft.id}`, headers: owner.auth, payload: { expectedVersion: 0, payload: { ...AMERICANO, name: "Edited" } } });
    assert.equal(edit.statusCode, 200);
    const response = await start(app, owner.auth, draft.id, 0);
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, "DRAFT_VERSION_CONFLICT");
    assert.equal(await tournamentCount(owner.id), 0);
    const missingVersion = await app.inject({ method: "POST", url: `/drafts/${draft.id}/start`, headers: owner.auth, payload: {} });
    assert.equal(missingVersion.statusCode, 400);
  });
});

test("retries and concurrent starts produce exactly one tournament", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("start-once");
    const draft = await saveDraft(app, owner.auth, AMERICANO);
    const [first, second] = await Promise.all([start(app, owner.auth, draft.id, 0), start(app, owner.auth, draft.id, 0)]);
    assert.equal(first.statusCode, 200, first.body);
    assert.equal(second.statusCode, 200, second.body);
    assert.equal(first.json().data.id, second.json().data.id);
    assert.deepEqual([first.json().alreadyStarted, second.json().alreadyStarted].sort(), [false, true]);
    const retry = await start(app, owner.auth, draft.id, 0);
    assert.equal(retry.json().alreadyStarted, true);
    assert.equal(retry.json().data.id, first.json().data.id);
    assert.equal(await tournamentCount(owner.id), 1);
  });
});

test("another organizer cannot start someone else's draft", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("start-owner");
    const stranger = await verifiedUser("start-stranger");
    const draft = await saveDraft(app, owner.auth, AMERICANO);
    const response = await start(app, stranger.auth, draft.id, 0);
    assert.equal(response.statusCode, 404);
    assert.equal(await tournamentCount(stranger.id), 0);
    assert.equal(await tournamentCount(owner.id), 0);
  });
});
