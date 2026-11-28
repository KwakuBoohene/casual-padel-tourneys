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
const ENV = { SHARED_ORGANIZER_ACCESS_ENABLED: "true", ORGANIZER_WEB_BASE_URL: "https://app.test" };

async function withApp<T>(fn: (app: App) => Promise<T>, env: Record<string, string> = ENV): Promise<T> {
  const keys = ["JWT_SECRET", "REDIS_URL", ...Object.keys(ENV)];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  for (const key of Object.keys(ENV)) delete process.env[key];
  Object.assign(process.env, env);
  sent.length = 0;
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
  name: "Shared Draft",
  variant: "CLASSIC",
  schedulingMode: "TARGET_GAMES",
  players: Array.from({ length: 8 }, (_, index) => ({ name: `P${index}` })),
  courts: 2,
  pointsPerMatch: 24,
  targetGamesPerPlayer: 2
};

async function saveDraft(app: App, owner: User) {
  const response = await app.inject({ method: "POST", url: "/drafts", headers: owner.auth, payload: { payload: DRAFT } });
  assert.equal(response.statusCode, 201, response.body);
  return response.json().data.id as string;
}

async function invite(app: App, by: User, draftId: string, email: string) {
  const response = await app.inject({ method: "POST", url: `/drafts/${draftId}/invitations`, headers: by.auth, payload: { email } });
  const message = sent.find((entry) => entry.to === email && entry.text.includes("/invite/draft#token="));
  const token = message?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
  return { response, token };
}

const post = (app: App, url: string, payload: Record<string, unknown>, headers: Record<string, string> = {}) =>
  app.inject({ method: "POST", url, headers, payload });

async function inviteAndAccept(app: App, owner: User, draftId: string, editor: User) {
  const { response, token } = await invite(app, owner, draftId, editor.email);
  assert.equal(response.statusCode, 201, response.body);
  assert.ok(token, "invitation email should contain a token link");
  const accepted = await post(app, "/draft-invitations/accept", { token }, editor.auth);
  assert.equal(accepted.statusCode, 200, accepted.body);
  return token!;
}

test("owner invites an editor who can preview, accept, edit and start", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("share-owner");
    const editor = await verifiedUser("share-editor");
    const draftId = await saveDraft(app, owner);
    const { response, token } = await invite(app, owner, draftId, editor.email);
    assert.equal(response.statusCode, 201, response.body);
    assert.ok(token);
    const stored = await prisma.draftInvitation.findFirst({ where: { draftId } });
    assert.notEqual(stored?.tokenHash, token);

    const preview = await post(app, "/draft-invitations/preview", { token });
    assert.equal(preview.statusCode, 200);
    assert.equal(preview.json().data.draftName, "Shared Draft");
    assert.equal(preview.json().data.status, "PENDING");
    assert.equal(preview.json().data.playerCount, 8);
    assert.ok(!preview.json().data.invitedEmail.includes(editor.id));

    const accepted = await post(app, "/draft-invitations/accept", { token }, editor.auth);
    assert.equal(accepted.statusCode, 200, accepted.body);
    assert.equal(accepted.json().data.draftId, draftId);

    const list = await app.inject({ method: "GET", url: "/drafts", headers: editor.auth });
    const row = list.json().data.find((entry: { id: string }) => entry.id === draftId);
    assert.equal(row?.role, "EDITOR");
    assert.deepEqual(row.collaborators.map((person: { userId: string }) => person.userId), [owner.id, editor.id]);

    const patch = await app.inject({ method: "PATCH", url: `/drafts/${draftId}`, headers: editor.auth, payload: { expectedVersion: 0, payload: { ...DRAFT, name: "Edited by editor" } } });
    assert.equal(patch.statusCode, 200, patch.body);
    assert.equal(patch.json().data.role, "EDITOR");

    const people = await app.inject({ method: "GET", url: `/drafts/${draftId}/people`, headers: editor.auth });
    assert.deepEqual(people.json().data.can, { managePeople: true, deleteDraft: false, changeSettings: false });

    const started = await post(app, `/drafts/${draftId}/start`, { expectedVersion: 1 }, editor.auth);
    assert.equal(started.statusCode, 200, started.body);
    const tournament = await prisma.tournament.findUnique({ where: { id: started.json().data.id } });
    assert.equal(tournament?.organizerId, owner.id);
  });
});

test("editors manage people but cannot delete the draft or change settings", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("perm-owner");
    const editor = await verifiedUser("perm-editor");
    const second = await verifiedUser("perm-second");
    const draftId = await saveDraft(app, owner);
    await inviteAndAccept(app, owner, draftId, editor);

    const deleted = await app.inject({ method: "DELETE", url: `/drafts/${draftId}`, headers: editor.auth });
    assert.equal(deleted.statusCode, 403);
    const settings = await app.inject({ method: "PATCH", url: `/drafts/${draftId}/settings`, headers: editor.auth, payload: { keepAccessAfterStart: false } });
    assert.equal(settings.statusCode, 403);

    await inviteAndAccept(app, editor, draftId, second);
    const pending = await invite(app, editor, draftId, `someone-${RUN}@example.com`);
    assert.equal(pending.response.statusCode, 201);
    const revoke = await app.inject({ method: "DELETE", url: `/drafts/${draftId}/invitations/${pending.response.json().data.id}`, headers: editor.auth });
    assert.equal(revoke.statusCode, 200);
    const removeSecond = await app.inject({ method: "DELETE", url: `/drafts/${draftId}/collaborators/${second.id}`, headers: editor.auth });
    assert.equal(removeSecond.statusCode, 200);
    const removeOwner = await app.inject({ method: "DELETE", url: `/drafts/${draftId}/collaborators/${owner.id}`, headers: editor.auth });
    assert.equal(removeOwner.statusCode, 404);

    const afterRemoval = await app.inject({ method: "GET", url: `/drafts/${draftId}`, headers: second.auth });
    assert.equal(afterRemoval.statusCode, 404);
    const ownerSettings = await app.inject({ method: "PATCH", url: `/drafts/${draftId}/settings`, headers: owner.auth, payload: { keepAccessAfterStart: false } });
    assert.equal(ownerSettings.statusCode, 200);
    assert.equal(ownerSettings.json().data.keepAccessAfterStart, false);
  });
});

test("an editor's access is limited to that one draft", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("iso-owner");
    const editor = await verifiedUser("iso-editor");
    const sharedId = await saveDraft(app, owner);
    const privateId = await saveDraft(app, owner);
    await inviteAndAccept(app, owner, sharedId, editor);
    const tournament = await app.inject({ method: "POST", url: "/tournaments", headers: owner.auth, payload: DRAFT });

    const other = await app.inject({ method: "GET", url: `/drafts/${privateId}`, headers: editor.auth });
    assert.equal(other.statusCode, 404);
    const live = await app.inject({ method: "GET", url: `/tournaments/${tournament.json().data.id}`, headers: editor.auth });
    assert.equal(live.statusCode, 404);
    const asOwner = { ...editor.auth, "x-organizer-id": owner.id };
    for (const url of ["/drafts", "/tournaments", "/me/players"]) {
      const response = await app.inject({ method: "GET", url, headers: asOwner });
      const leaked = response.statusCode === 200 && JSON.stringify(response.json()).includes(privateId);
      assert.equal(leaked, false, `${url} leaked owner data`);
    }
    const ownerList = await app.inject({ method: "GET", url: "/drafts", headers: asOwner });
    assert.equal(ownerList.statusCode, 404);
  });
});

test("invite tokens: email match, decline, resend and expiry", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("tok-owner");
    const invitee = await verifiedUser("tok-invitee");
    const stranger = await verifiedUser("tok-stranger");
    const draftId = await saveDraft(app, owner);
    const first = await invite(app, owner, draftId, invitee.email);

    const wrongUser = await post(app, "/draft-invitations/accept", { token: first.token }, stranger.auth);
    assert.equal(wrongUser.statusCode, 403);
    assert.equal(wrongUser.json().code, "DRAFT_INVITATION_EMAIL_MISMATCH");

    const resent = await post(app, `/drafts/${draftId}/invitations/${first.response.json().data.id}/resend`, {}, owner.auth);
    assert.equal(resent.statusCode, 200, resent.body);
    const oldToken = await post(app, "/draft-invitations/preview", { token: first.token });
    assert.equal(oldToken.statusCode, 410);
    const newToken = sent.filter((entry) => entry.to === invitee.email).at(-1)?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1];

    const declined = await post(app, "/draft-invitations/decline", { token: newToken }, invitee.auth);
    assert.equal(declined.statusCode, 200);
    const acceptAfterDecline = await post(app, "/draft-invitations/accept", { token: newToken }, invitee.auth);
    assert.equal(acceptAfterDecline.statusCode, 410);

    const again = await invite(app, owner, draftId, invitee.email);
    await prisma.draftInvitation.update({ where: { id: again.response.json().data.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await post(app, "/draft-invitations/accept", { token: again.token }, invitee.auth);
    assert.equal(expired.statusCode, 410);
  });
});

test("people who already have access cannot be invited; sharing can be disabled", async () => {
  await withApp(async (app) => {
    const owner = await verifiedUser("dup-owner");
    const editor = await verifiedUser("dup-editor");
    const draftId = await saveDraft(app, owner);
    await inviteAndAccept(app, owner, draftId, editor);
    for (const email of [owner.email, editor.email]) {
      const { response } = await invite(app, owner, draftId, email);
      assert.equal(response.statusCode, 409);
      assert.equal(response.json().code, "ALREADY_HAS_ACCESS");
    }
  });
  await withApp(
    async (app) => {
      const owner = await verifiedUser("off-owner");
      const draftId = await saveDraft(app, owner);
      const { response } = await invite(app, owner, draftId, `x-${RUN}@example.com`);
      assert.equal(response.statusCode, 404);
    },
    { ORGANIZER_WEB_BASE_URL: "https://app.test" }
  );
});
