import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import { signAuthToken } from "../../src/lib/auth.js";
import type { MailMessage, Mailer } from "../../src/lib/mail/index.js";
import { setMailerOverride } from "../../src/lib/mail/index.js";
import { hashMagicToken } from "../../src/lib/magicTokens.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-verify-gate";

const createPayload = {
  name: "Gate Social",
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

test("fresh email user can create a tournament within verify window", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const email = `gate-fresh-${Date.now()}@example.com`;
  try {
    await withApp(async (app) => {
      const user = await prisma.user.create({
        data: {
          email,
          name: "Fresh",
          isGuest: false,
          emailVerificationDueAt: new Date(Date.now() + 86_400_000)
        }
      });
      const token = signAuthToken(user);

      const createResponse = await app.inject({
        method: "POST",
        url: "/tournaments",
        headers: { authorization: `Bearer ${token}` },
        payload: createPayload
      });
      assert.equal(createResponse.statusCode, 200);
      assert.equal(createResponse.json().data.organizerId, user.id);

      const payload = jwt.verify(token, JWT_SECRET) as {
        emailVerified?: boolean;
        verifyBy?: number;
      };
      assert.equal(payload.emailVerified, false);
      assert.ok(typeof payload.verifyBy === "number");
    });
  } finally {
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  }
});

test("after dueAt, list/create return EMAIL_VERIFY_REQUIRED; verify consume unlocks", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const email = `gate-due-${Date.now()}@example.com`;
  const mailer = new CapturingMailer();
  setMailerOverride(mailer);
  try {
    await withApp(async (app) => {
      const user = await prisma.user.create({
        data: {
          email,
          name: "Due",
          isGuest: false,
          emailVerificationDueAt: new Date(Date.now() - 1000)
        }
      });
      const blockedToken = signAuthToken(user);

      const listBlocked = await app.inject({
        method: "GET",
        url: "/tournaments",
        headers: { authorization: `Bearer ${blockedToken}` }
      });
      assert.equal(listBlocked.statusCode, 403);
      assert.equal(listBlocked.json().code, "EMAIL_VERIFY_REQUIRED");

      const createBlocked = await app.inject({
        method: "POST",
        url: "/tournaments",
        headers: { authorization: `Bearer ${blockedToken}` },
        payload: createPayload
      });
      assert.equal(createBlocked.statusCode, 403);
      assert.equal(createBlocked.json().code, "EMAIL_VERIFY_REQUIRED");

      const resend = await app.inject({
        method: "POST",
        url: "/auth/verify/resend",
        headers: { authorization: `Bearer ${blockedToken}` }
      });
      assert.equal(resend.statusCode, 200);

      const match = mailer.last?.text?.match(/token=([^\s&]+)/);
      assert.ok(match?.[1]);
      const rawToken = decodeURIComponent(match[1]);
      const tokenRow = await prisma.magicLinkToken.findFirst({
        where: { userId: user.id, purpose: "VERIFY" },
        orderBy: { createdAt: "desc" }
      });
      assert.ok(tokenRow);
      assert.equal(tokenRow.tokenHash, hashMagicToken(rawToken));

      const consume = await app.inject({
        method: "POST",
        url: "/auth/magic-link/consume",
        payload: { token: rawToken }
      });
      assert.equal(consume.statusCode, 200);
      const body = consume.json();
      assert.equal(body.user.emailVerified, true);
      const jwtPayload = jwt.verify(body.token, JWT_SECRET) as { emailVerified?: boolean };
      assert.equal(jwtPayload.emailVerified, true);

      const listOk = await app.inject({
        method: "GET",
        url: "/tournaments",
        headers: { authorization: `Bearer ${body.token}` }
      });
      assert.equal(listOk.statusCode, 200);
    });
  } finally {
    setMailerOverride(null);
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  }
});

test("guest bypasses verify gate", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const guestId = `guestgate${Date.now()}`;
  try {
    await withApp(async (app) => {
      const guest = await app.inject({
        method: "POST",
        url: "/auth/guest",
        payload: { guestId }
      });
      assert.equal(guest.statusCode, 200);
      const token = guest.json().token;

      const list = await app.inject({
        method: "GET",
        url: "/tournaments",
        headers: { authorization: `Bearer ${token}` }
      });
      assert.equal(list.statusCode, 200);
    });
  } finally {
    await prisma.user.deleteMany({ where: { guestId } }).catch(() => undefined);
  }
});
