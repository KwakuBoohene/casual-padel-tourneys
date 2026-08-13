import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../../src/app.js";
import { signAuthToken } from "../../src/lib/auth.js";
import type { MailMessage, Mailer } from "../../src/lib/mail/index.js";
import { setMailerOverride } from "../../src/lib/mail/index.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-attach";

const createPayload = {
  name: "Attach Social",
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

class CapturingMailer implements Mailer {
  last: MailMessage | null = null;
  async send(message: MailMessage): Promise<void> {
    this.last = message;
  }
}

async function dbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function withApp<T>(fn: (app: Awaited<ReturnType<typeof createApp>>) => Promise<T>): Promise<T> {
  const original = {
    JWT_SECRET: process.env.JWT_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    MAIL_PROVIDER: process.env.MAIL_PROVIDER
  };
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  process.env.MAIL_PROVIDER = "console";
  const app = await createApp();
  try {
    return await fn(app);
  } finally {
    await app.close();
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("guest creates tournament, attaches email, list still shows it", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const guestId = `attachguest${Date.now()}`;
  const email = `attach-${Date.now()}@example.com`;
  const mailer = new CapturingMailer();
  setMailerOverride(mailer);
  try {
    await withApp(async (app) => {
      const guestRes = await app.inject({
        method: "POST",
        url: "/auth/guest",
        payload: { guestId }
      });
      assert.equal(guestRes.statusCode, 200);
      const guestToken = guestRes.json().token;
      const guestUserId = guestRes.json().user.id;

      const created = await app.inject({
        method: "POST",
        url: "/tournaments",
        headers: { authorization: `Bearer ${guestToken}` },
        payload: createPayload
      });
      assert.equal(created.statusCode, 200);
      assert.equal(created.json().data.organizerId, guestUserId);

      const attach = await app.inject({
        method: "POST",
        url: "/auth/attach/email",
        headers: { authorization: `Bearer ${guestToken}` },
        payload: { email }
      });
      assert.equal(attach.statusCode, 200);

      const match = mailer.last?.text?.match(/token=([^\s&]+)/);
      assert.ok(match?.[1]);
      const rawToken = decodeURIComponent(match[1]);

      const consume = await app.inject({
        method: "POST",
        url: "/auth/magic-link/consume",
        payload: { token: rawToken }
      });
      assert.equal(consume.statusCode, 200);
      assert.equal(consume.json().user.id, guestUserId);
      assert.equal(consume.json().user.isGuest, false);
      assert.equal(consume.json().user.emailVerified, true);

      const updated = await prisma.user.findUnique({ where: { id: guestUserId } });
      assert.equal(updated?.guestId, guestId);
      assert.equal(updated?.email, email);

      const list = await app.inject({
        method: "GET",
        url: "/tournaments",
        headers: { authorization: `Bearer ${consume.json().token}` }
      });
      assert.equal(list.statusCode, 200);
      const ids = list.json().data.map((row: { id: string }) => row.id);
      assert.ok(ids.includes(created.json().data.id));
    });
  } finally {
    setMailerOverride(null);
    await prisma.user.deleteMany({ where: { guestId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  }
});

test("Google sign-in links googleId onto existing email user without second row", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const email = `link-${Date.now()}@example.com`;
  const googleId = `google-link-${Date.now()}`;
  try {
    await withApp(async (app) => {
      const existing = await prisma.user.create({
        data: {
          email,
          name: "Email First",
          isGuest: false,
          emailVerifiedAt: new Date(),
          emailVerificationDueAt: new Date(Date.now() + 86_400_000)
        }
      });

      const linked = await prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId,
          isGuest: false,
          emailVerifiedAt: new Date()
        }
      });

      const count = await prisma.user.count({ where: { email } });
      assert.equal(count, 1);
      assert.equal(linked.id, existing.id);
      assert.equal(linked.googleId, googleId);

      const token = signAuthToken(linked);
      const me = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { authorization: `Bearer ${token}` }
      });
      assert.equal(me.statusCode, 200);
      assert.equal(me.json().user.id, existing.id);
    });
  } finally {
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  }
});

test("attach email conflict when email belongs to another user", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const guestId = `conflictguest${Date.now()}`;
  const email = `conflict-${Date.now()}@example.com`;
  try {
    await prisma.user.create({
      data: {
        email,
        name: "Taken",
        isGuest: false,
        emailVerifiedAt: new Date()
      }
    });

    await withApp(async (app) => {
      const guestRes = await app.inject({
        method: "POST",
        url: "/auth/guest",
        payload: { guestId }
      });
      const guestToken = guestRes.json().token;

      const attach = await app.inject({
        method: "POST",
        url: "/auth/attach/email",
        headers: { authorization: `Bearer ${guestToken}` },
        payload: { email }
      });
      assert.equal(attach.statusCode, 409);
    });
  } finally {
    await prisma.user.deleteMany({ where: { guestId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  }
});
