import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";
const RUN = Date.now().toString(36);
type App = Awaited<ReturnType<typeof createApp>>;

function signUser(id: string): string {
  return jwt.sign(
    { sub: id, email: `${id}@example.com`, name: `User ${id}`, emailVerified: true, isGuest: false },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function verifiedUser(prefix: string) {
  const id = `${prefix}-${RUN}`;
  await prisma.user.upsert({
    where: { id },
    create: { id, email: `${id}@example.com`, name: `User ${id}`, isGuest: false, emailVerifiedAt: new Date() },
    update: { emailVerifiedAt: new Date(), isGuest: false }
  });
  return { id, auth: { authorization: `Bearer ${signUser(id)}` } };
}

async function withApp<T>(fn: (app: App) => Promise<T>, env: Record<string, string> = {}): Promise<T> {
  const saved = { JWT_SECRET: process.env.JWT_SECRET, REDIS_URL: process.env.REDIS_URL, ...Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]])) };
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  Object.assign(process.env, env);
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

const DRAFT = { mode: "AMERICANO", name: "Friday Draft", players: [{ name: "Alex" }, { name: "" }], courts: 2 };

async function createDraft(app: App, headers: Record<string, string>, payload: unknown = DRAFT) {
  const response = await app.inject({ method: "POST", url: "/drafts", headers, payload: { payload } });
  assert.equal(response.statusCode, 201, response.body);
  return response.json().data as { id: string; version: number; readiness: { ready: boolean; blockingReason?: string } };
}

test("draft CRUD: create, list, get, update, delete", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("draft-owner");
    const draft = await createDraft(app, owner.auth);
    assert.equal(draft.version, 0);
    assert.equal(draft.readiness.ready, false);
    assert.equal(draft.readiness.blockingReason, "Choose a format");

    const list = await app.inject({ method: "GET", url: "/drafts", headers: owner.auth });
    const row = list.json().data.find((entry: { id: string }) => entry.id === draft.id);
    assert.equal(row.name, "Friday Draft");
    assert.equal(row.playerCount, 1);
    assert.equal(row.role, "OWNER");

    const updated = await app.inject({
      method: "PATCH",
      url: `/drafts/${draft.id}`,
      headers: owner.auth,
      payload: { expectedVersion: 0, payload: { ...DRAFT, name: "Renamed" } }
    });
    assert.equal(updated.statusCode, 200, updated.body);
    assert.equal(updated.json().data.version, 1);
    assert.equal(updated.json().data.name, "Renamed");
    assert.equal(updated.json().data.updatedBy.id, owner.id);

    const fetched = await app.inject({ method: "GET", url: `/drafts/${draft.id}`, headers: owner.auth });
    assert.equal(fetched.json().data.payload.name, "Renamed");

    const deleted = await app.inject({ method: "DELETE", url: `/drafts/${draft.id}`, headers: owner.auth });
    assert.equal(deleted.statusCode, 200);
    const gone = await app.inject({ method: "GET", url: `/drafts/${draft.id}`, headers: owner.auth });
    assert.equal(gone.statusCode, 404);
  });
});

test("stale expectedVersion returns 409 with the latest draft", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("draft-conflict");
    const draft = await createDraft(app, owner.auth);
    const patch = (expectedVersion: number, name: string) =>
      app.inject({ method: "PATCH", url: `/drafts/${draft.id}`, headers: owner.auth, payload: { expectedVersion, payload: { ...DRAFT, name } } });
    assert.equal((await patch(0, "First")).statusCode, 200);
    const stale = await patch(0, "Second");
    assert.equal(stale.statusCode, 409);
    assert.equal(stale.json().code, "DRAFT_VERSION_CONFLICT");
    assert.equal(stale.json().latest.version, 1);
    assert.equal(stale.json().latest.payload.name, "First");
  });
});

test("invalid bodies are rejected", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("draft-invalid");
    const noMode = await app.inject({ method: "POST", url: "/drafts", headers: owner.auth, payload: { payload: { name: "x" } } });
    assert.equal(noMode.statusCode, 400);
    const draft = await createDraft(app, owner.auth);
    const noVersion = await app.inject({ method: "PATCH", url: `/drafts/${draft.id}`, headers: owner.auth, payload: { payload: DRAFT } });
    assert.equal(noVersion.statusCode, 400);
    const anonymous = await app.inject({ method: "GET", url: "/drafts" });
    assert.equal(anonymous.statusCode, 401);
  });
});

test("other organizers cannot see or change a draft; public routes cannot reach it", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("draft-private-owner");
    const stranger = await verifiedUser("draft-stranger");
    const draft = await createDraft(app, owner.auth);
    for (const method of ["GET", "DELETE"] as const) {
      const response = await app.inject({ method, url: `/drafts/${draft.id}`, headers: stranger.auth });
      assert.equal(response.statusCode, 404, `${method} should 404`);
    }
    const patch = await app.inject({ method: "PATCH", url: `/drafts/${draft.id}`, headers: stranger.auth, payload: { expectedVersion: 0, payload: DRAFT } });
    assert.equal(patch.statusCode, 404);
    const list = await app.inject({ method: "GET", url: "/drafts", headers: stranger.auth });
    assert.equal(list.json().data.some((entry: { id: string }) => entry.id === draft.id), false);
    const viewer = await app.inject({ method: "GET", url: `/public/${draft.id}` });
    assert.equal(viewer.statusCode, 404);
  });
});

test("account managers can list, edit and delete the owner's drafts", async () => {
  await withApp(
    async (app) => {
      const owner = await verifiedUser("draft-mgr-owner");
      const manager = await verifiedUser("draft-mgr");
      await prisma.organizerMembership.upsert({
        where: { organizerId_memberUserId: { organizerId: owner.id, memberUserId: manager.id } },
        create: { organizerId: owner.id, memberUserId: manager.id },
        update: { revokedAt: null }
      });
      const draft = await createDraft(app, owner.auth);
      const asManager = { ...manager.auth, "x-organizer-id": owner.id };
      const list = await app.inject({ method: "GET", url: "/drafts", headers: asManager });
      const row = list.json().data.find((entry: { id: string }) => entry.id === draft.id);
      assert.equal(row?.role, "MANAGER");
      const patch = await app.inject({ method: "PATCH", url: `/drafts/${draft.id}`, headers: manager.auth, payload: { expectedVersion: 0, payload: DRAFT } });
      assert.equal(patch.statusCode, 200, patch.body);
      assert.equal(patch.json().data.updatedBy.id, manager.id);
      const deleted = await app.inject({ method: "DELETE", url: `/drafts/${draft.id}`, headers: manager.auth });
      assert.equal(deleted.statusCode, 200);
    },
    { SHARED_ORGANIZER_ACCESS_ENABLED: "true" }
  );
});

test("a started draft is read-only and leaves the list", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("draft-started");
    const draft = await createDraft(app, owner.auth);
    await prisma.tournamentDraft.update({ where: { id: draft.id }, data: { startedTournamentId: `t-${draft.id}` } });
    const patch = await app.inject({ method: "PATCH", url: `/drafts/${draft.id}`, headers: owner.auth, payload: { expectedVersion: 0, payload: DRAFT } });
    assert.equal(patch.statusCode, 409);
    assert.equal(patch.json().code, "DRAFT_ALREADY_STARTED");
    const deleted = await app.inject({ method: "DELETE", url: `/drafts/${draft.id}`, headers: owner.auth });
    assert.equal(deleted.statusCode, 409);
    const fetched = await app.inject({ method: "GET", url: `/drafts/${draft.id}`, headers: owner.auth });
    assert.equal(fetched.json().data.startedTournamentId, `t-${draft.id}`);
    const list = await app.inject({ method: "GET", url: "/drafts", headers: owner.auth });
    assert.equal(list.json().data.some((entry: { id: string }) => entry.id === draft.id), false);
  });
});

test("autosave activity is throttled and never stores the payload", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("draft-activity");
    const draft = await createDraft(app, owner.auth);
    for (const expectedVersion of [0, 1, 2]) {
      const response = await app.inject({ method: "PATCH", url: `/drafts/${draft.id}`, headers: owner.auth, payload: { expectedVersion, payload: DRAFT } });
      assert.equal(response.statusCode, 200, response.body);
    }
    const rows = await prisma.organizerActivity.findMany({ where: { targetId: draft.id }, orderBy: { occurredAt: "asc" } });
    assert.deepEqual(rows.map((row) => row.action), ["POST /drafts", "PATCH /drafts/:id"]);
    assert.equal(JSON.stringify(rows.map((row) => row.metadata)).includes("Alex"), false);
  });
});
