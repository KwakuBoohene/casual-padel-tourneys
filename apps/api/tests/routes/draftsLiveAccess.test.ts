import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import { setMailerOverride } from "../../src/lib/mail/index.js";
import type { MailMessage } from "../../src/lib/mail/types.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";
const RUN = Date.now().toString(36);
type App = Awaited<ReturnType<typeof createApp>>;
type User = { id: string; email: string; auth: Record<string, string> };

async function verifiedUser(prefix: string): Promise<User> {
  const id = `${prefix}-${RUN}`;
  const email = `${id}@example.com`;
  await prisma.user.upsert({
    where: { id },
    create: { id, email, name: `User ${prefix}`, isGuest: false, emailVerifiedAt: new Date() },
    update: { emailVerifiedAt: new Date(), isGuest: false }
  });
  const token = jwt.sign({ sub: id, email, name: `User ${prefix}`, emailVerified: true, isGuest: false }, JWT_SECRET, {
    expiresIn: "1h"
  });
  return { id, email, auth: { authorization: `Bearer ${token}` } };
}

const sent: MailMessage[] = [];
async function withApp<T>(fn: (app: App) => Promise<T>): Promise<T> {
  const keys = ["JWT_SECRET", "REDIS_URL", "SHARED_ORGANIZER_ACCESS_ENABLED", "ORGANIZER_WEB_BASE_URL"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    JWT_SECRET,
    SHARED_ORGANIZER_ACCESS_ENABLED: "true",
    ORGANIZER_WEB_BASE_URL: "https://app.test"
  });
  delete process.env.REDIS_URL;
  setMailerOverride({ send: async (message) => void sent.push(message) });
  const app = await createApp();
  try {
    return await fn(app);
  } finally {
    await app.close();
    setMailerOverride(null);
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const DRAFT = {
  mode: "AMERICANO",
  name: "Live Access",
  variant: "CLASSIC",
  schedulingMode: "TARGET_GAMES",
  players: Array.from({ length: 8 }, (_, index) => ({ name: `P${index}` })),
  courts: 2,
  pointsPerMatch: 24,
  targetGamesPerPlayer: 2
};

/** Owner saves a draft, shares it with `editor`, optionally turns off keep-access, then starts it. */
async function startSharedDraft(app: App, owner: User, editor: User, keepAccess: boolean) {
  const created = await app.inject({ method: "POST", url: "/drafts", headers: owner.auth, payload: { payload: DRAFT } });
  const draftId = created.json().data.id as string;
  await app.inject({ method: "POST", url: `/drafts/${draftId}/invitations`, headers: owner.auth, payload: { email: editor.email } });
  const token = sent.filter((entry) => entry.to === editor.email).at(-1)?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
  const accepted = await app.inject({ method: "POST", url: "/draft-invitations/accept", headers: editor.auth, payload: { token } });
  assert.equal(accepted.statusCode, 200, accepted.body);
  if (!keepAccess) {
    const off = await app.inject({ method: "PATCH", url: `/drafts/${draftId}/settings`, headers: owner.auth, payload: { keepAccessAfterStart: false } });
    assert.equal(off.statusCode, 200, off.body);
  }
  const started = await app.inject({ method: "POST", url: `/drafts/${draftId}/start`, headers: owner.auth, payload: { expectedVersion: 0 } });
  assert.equal(started.statusCode, 200, started.body);
  return started.json().data as { id: string; version: number };
}

test("editors keep live-control access to the started tournament only", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("live-owner");
    const editor = await verifiedUser("live-editor");
    const tournament = await startSharedDraft(app, owner, editor, true);
    const other = await app.inject({ method: "POST", url: "/tournaments", headers: owner.auth, payload: DRAFT });

    const list = await app.inject({ method: "GET", url: "/tournaments", headers: editor.auth });
    const row = list.json().data.find((entry: { id: string }) => entry.id === tournament.id);
    assert.equal(row?.accessRole, "EDITOR");
    assert.equal(list.json().data.some((entry: { id: string }) => entry.id === other.json().data.id), false);

    const read = await app.inject({ method: "GET", url: `/tournaments/${tournament.id}`, headers: editor.auth });
    assert.equal(read.statusCode, 200, read.body);
    const rename = await app.inject({
      method: "POST",
      url: "/tournaments/rename",
      headers: editor.auth,
      payload: { tournamentId: tournament.id, newName: "Renamed live", expectedVersion: tournament.version }
    });
    assert.equal(rename.statusCode, 200, rename.body);

    const deleted = await app.inject({ method: "DELETE", url: `/tournaments/${tournament.id}`, headers: editor.auth });
    assert.equal(deleted.statusCode, 403);
    const otherRead = await app.inject({ method: "GET", url: `/tournaments/${other.json().data.id}`, headers: editor.auth });
    assert.equal(otherRead.statusCode, 404);
  });
});

test("shared live events require expectedVersion, even for the owner", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("ver-owner");
    const editor = await verifiedUser("ver-editor");
    const tournament = await startSharedDraft(app, owner, editor, true);
    const rename = await app.inject({
      method: "POST",
      url: "/tournaments/rename",
      headers: owner.auth,
      payload: { tournamentId: tournament.id, newName: "No version" }
    });
    assert.equal(rename.statusCode, 409);
    assert.equal(rename.json().code, "CLIENT_UPDATE_REQUIRED");
  });
});

test("with keep-access off, editors lose access once the draft starts", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("nokeep-owner");
    const editor = await verifiedUser("nokeep-editor");
    const tournament = await startSharedDraft(app, owner, editor, false);
    const read = await app.inject({ method: "GET", url: `/tournaments/${tournament.id}`, headers: editor.auth });
    assert.equal(read.statusCode, 404);
    const rows = await prisma.tournamentCollaborator.count({ where: { tournamentId: tournament.id } });
    assert.equal(rows, 0);
  });
});
