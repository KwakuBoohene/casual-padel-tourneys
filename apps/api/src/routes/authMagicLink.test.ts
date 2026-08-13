import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashMagicToken } from "../lib/magicTokens.js";

const JWT_SECRET = "test-secret-key-for-magic-link";

async function dbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

test("magic link request is generic; consume once then fails", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

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

  const email = `magic-${Date.now()}@example.com`;
  const app = await createApp();
  try {
    const requestResponse = await app.inject({
      method: "POST",
      url: "/auth/magic-link",
      payload: { email }
    });
    assert.equal(requestResponse.statusCode, 200);

    const user = await prisma.user.findUnique({ where: { email } });
    assert.ok(user);
    assert.ok(user.emailVerificationDueAt);

    const tokenRow = await prisma.magicLinkToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });
    assert.ok(tokenRow);

    // Recover raw token by scanning recent creates is impossible (hash only).
    // Issue a known token for consume tests.
    const rawToken = `test-token-${Date.now()}-abcdefghijklmnop`;
    await prisma.magicLinkToken.create({
      data: {
        userId: user.id,
        tokenHash: hashMagicToken(rawToken),
        purpose: "LOGIN",
        expiresAt: new Date(Date.now() + 60_000)
      }
    });

    const consumeOk = await app.inject({
      method: "POST",
      url: "/auth/magic-link/consume",
      payload: { token: rawToken }
    });
    assert.equal(consumeOk.statusCode, 200);
    const body = consumeOk.json();
    assert.ok(body.token);
    const payload = jwt.verify(body.token, JWT_SECRET) as { sub: string };
    assert.equal(payload.sub, user.id);

    const consumeAgain = await app.inject({
      method: "POST",
      url: "/auth/magic-link/consume",
      payload: { token: rawToken }
    });
    assert.equal(consumeAgain.statusCode, 401);

    const unknown = await app.inject({
      method: "POST",
      url: "/auth/magic-link",
      payload: { email: `unknown-${Date.now()}@example.com` }
    });
    assert.equal(unknown.statusCode, 200);
  } finally {
    await app.close();
    await prisma.user.deleteMany({ where: { email: { startsWith: "magic-" } } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { startsWith: "unknown-" } } }).catch(() => undefined);
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("expired magic link fails closed", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  process.env.MAIL_PROVIDER = "console";

  const email = `expired-${Date.now()}@example.com`;
  const app = await createApp();
  try {
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
  } finally {
    await app.close();
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
});
