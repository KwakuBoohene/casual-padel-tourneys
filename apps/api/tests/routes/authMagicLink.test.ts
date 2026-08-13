import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import type { MailMessage, Mailer } from "../../src/lib/mail/index.js";
import { prisma } from "../../src/lib/prisma.js";
import { hashMagicToken } from "../../src/lib/magicTokens.js";
import { setMailerOverride } from "../../src/lib/mail/index.js";

const JWT_SECRET = "test-secret-key-for-magic-link";

class CapturingMailer implements Mailer {
  last: MailMessage | null = null;
  async send(message: MailMessage): Promise<void> {
    this.last = message;
  }
}

function rawTokenFromMail(message: MailMessage | null): string {
  assert.ok(message?.text);
  const match = message.text.match(/token=([^\s&]+)/);
  assert.ok(match?.[1], "expected token query param in email body");
  return decodeURIComponent(match[1]);
}

async function dbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function withMagicApp<T>(fn: (app: Awaited<ReturnType<typeof createApp>>, mailer: CapturingMailer) => Promise<T>): Promise<T> {
  const original = {
    JWT_SECRET: process.env.JWT_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    MAIL_PROVIDER: process.env.MAIL_PROVIDER,
    AUTH_MAGIC_LINK_BASE_URL: process.env.AUTH_MAGIC_LINK_BASE_URL
  };
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  process.env.MAIL_PROVIDER = "console";
  process.env.AUTH_MAGIC_LINK_BASE_URL = "padel://auth/magic";

  const mailer = new CapturingMailer();
  setMailerOverride(mailer);
  const app = await createApp();
  try {
    return await fn(app, mailer);
  } finally {
    setMailerOverride(null);
    await app.close();
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("unknown email still 200; consume once succeeds then fails; marks verified", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const email = `magic-${Date.now()}@example.com`;
  try {
    await withMagicApp(async (app, mailer) => {
      const unknown = await app.inject({
        method: "POST",
        url: "/auth/magic-link",
        payload: { email: `unknown-${Date.now()}@example.com` }
      });
      assert.equal(unknown.statusCode, 200);
      assert.match(unknown.json().message, /sign-in link/i);

      const requestResponse = await app.inject({
        method: "POST",
        url: "/auth/magic-link",
        payload: { email }
      });
      assert.equal(requestResponse.statusCode, 200);

      const user = await prisma.user.findUnique({ where: { email } });
      assert.ok(user);
      assert.ok(user.emailVerificationDueAt);
      assert.equal(user.emailVerifiedAt, null);

      const rawToken = rawTokenFromMail(mailer.last);
      const tokenRow = await prisma.magicLinkToken.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" }
      });
      assert.ok(tokenRow);
      assert.equal(tokenRow.tokenHash, hashMagicToken(rawToken));
      assert.notEqual(tokenRow.tokenHash, rawToken);

      const consumeOk = await app.inject({
        method: "POST",
        url: "/auth/magic-link/consume",
        payload: { token: rawToken }
      });
      assert.equal(consumeOk.statusCode, 200);
      const body = consumeOk.json();
      assert.ok(body.token);
      const payload = jwt.verify(body.token, JWT_SECRET) as { sub: string; email: string };
      assert.equal(payload.sub, user.id);
      assert.equal(payload.email, email);

      const verified = await prisma.user.findUnique({ where: { id: user.id } });
      assert.ok(verified?.emailVerifiedAt);

      const consumeAgain = await app.inject({
        method: "POST",
        url: "/auth/magic-link/consume",
        payload: { token: rawToken }
      });
      assert.equal(consumeAgain.statusCode, 401);
    });
  } finally {
    await prisma.user.deleteMany({ where: { email: { startsWith: "magic-" } } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { startsWith: "unknown-" } } }).catch(() => undefined);
  }
});

test("expired magic link fails closed", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const email = `expired-${Date.now()}@example.com`;
  try {
    await withMagicApp(async (app) => {
      const user = await prisma.user.create({
        data: {
          email,
          name: "Expired",
          emailVerificationDueAt: new Date(Date.now() + 86_400_000)
        }
      });
      const rawToken = `expired-token-${Date.now()}-abcdefghijklmnop`;
      await prisma.magicLinkToken.create({
        data: {
          userId: user.id,
          tokenHash: hashMagicToken(rawToken),
          purpose: "LOGIN",
          expiresAt: new Date(Date.now() - 1000)
        }
      });

      const response = await app.inject({
        method: "POST",
        url: "/auth/magic-link/consume",
        payload: { token: rawToken }
      });
      assert.equal(response.statusCode, 401);
    });
  } finally {
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  }
});

test("invalid magic link body returns 400", async () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  process.env.MAIL_PROVIDER = "console";
  const app = await createApp();
  try {
    const badEmail = await app.inject({
      method: "POST",
      url: "/auth/magic-link",
      payload: { email: "not-an-email" }
    });
    assert.equal(badEmail.statusCode, 400);

    const badToken = await app.inject({
      method: "POST",
      url: "/auth/magic-link/consume",
      payload: { token: "short" }
    });
    assert.equal(badToken.statusCode, 400);
  } finally {
    await app.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
});
