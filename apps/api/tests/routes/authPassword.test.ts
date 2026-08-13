import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import { clearPasswordLoginAttempts } from "../../src/lib/passwordLoginAttempts.js";
import {
  ensurePasswordProtocolReady,
  passwordProtocol
} from "../../src/lib/passwordProtocol.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-password-auth";

async function dbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function withPasswordApp<T>(fn: (app: Awaited<ReturnType<typeof createApp>>) => Promise<T>): Promise<T> {
  await ensurePasswordProtocolReady();
  const setup = passwordProtocol.createSetup();

  const original = {
    JWT_SECRET: process.env.JWT_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    OPAQUE_SERVER_SETUP: process.env.OPAQUE_SERVER_SETUP,
    MAIL_PROVIDER: process.env.MAIL_PROVIDER
  };
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.REDIS_URL;
  process.env.OPAQUE_SERVER_SETUP = setup;
  process.env.MAIL_PROVIDER = "console";
  clearPasswordLoginAttempts();

  const app = await createApp();
  try {
    return await fn(app);
  } finally {
    clearPasswordLoginAttempts();
    await app.close();
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function registerWithPassword(
  app: Awaited<ReturnType<typeof createApp>>,
  email: string,
  password: string
): Promise<void> {
  await ensurePasswordProtocolReady();
  const { clientRegistrationState, registrationRequest } = passwordProtocol.client.startRegistration({
    password
  });

  const start = await app.inject({
    method: "POST",
    url: "/auth/password/register/start",
    payload: { email, registrationRequest }
  });
  assert.equal(start.statusCode, 200, start.body);
  const { registrationResponse } = start.json();

  const { registrationRecord } = passwordProtocol.client.finishRegistration({
    clientRegistrationState,
    registrationResponse,
    password
  });

  const finish = await app.inject({
    method: "POST",
    url: "/auth/password/register/finish",
    payload: { email, registrationRecord }
  });
  assert.equal(finish.statusCode, 200, finish.body);
  assert.equal(finish.json().ok, true);
}

async function loginWithPassword(
  app: Awaited<ReturnType<typeof createApp>>,
  email: string,
  password: string
): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  await ensurePasswordProtocolReady();
  const { clientLoginState, startLoginRequest } = passwordProtocol.client.startLogin({ password });

  const start = await app.inject({
    method: "POST",
    url: "/auth/password/login/start",
    payload: { email, startLoginRequest }
  });
  assert.equal(start.statusCode, 200, start.body);
  const { loginResponse, loginId } = start.json();

  const loginResult = passwordProtocol.client.finishLogin({
    clientLoginState,
    loginResponse,
    password
  });
  if (!loginResult) {
    return { statusCode: 401, body: { message: "client rejected" } };
  }

  const finish = await app.inject({
    method: "POST",
    url: "/auth/password/login/finish",
    payload: {
      email,
      loginId,
      finishLoginRequest: loginResult.finishLoginRequest
    }
  });
  return { statusCode: finish.statusCode, body: finish.json() };
}

test("password register + login succeeds; envelope stored without hash column", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const email = `pwd-${Date.now()}@example.com`;
  const password = "correct-horse-battery-staple";
  try {
    await withPasswordApp(async (app) => {
      await registerWithPassword(app, email, password);

      const user = await prisma.user.findUnique({
        where: { email },
        include: { opaqueRecord: true }
      });
      assert.ok(user);
      assert.ok(user.emailVerificationDueAt);
      assert.ok(user.opaqueRecord?.envelope);
      assert.ok(user.opaqueRecord.envelope.length > 20);

      const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'User' OR table_name = 'OpaqueRecord'
      `;
      const names = columns.map((c) => c.column_name);
      assert.equal(names.includes("passwordHash"), false);
      assert.equal(names.includes("password_hash"), false);

      const login = await loginWithPassword(app, email, password);
      assert.equal(login.statusCode, 200);
      assert.ok(typeof login.body.token === "string");
      const payload = jwt.verify(login.body.token as string, JWT_SECRET) as { sub: string };
      assert.equal(payload.sub, user.id);
    });
  } finally {
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  }
});

test("wrong password fails closed", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const email = `pwd-bad-${Date.now()}@example.com`;
  try {
    await withPasswordApp(async (app) => {
      await registerWithPassword(app, email, "right-password-value-123");
      const login = await loginWithPassword(app, email, "wrong-password-value-456");
      assert.equal(login.statusCode, 401);
    });
  } finally {
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  }
});

test("second password register for same email is rejected", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("DATABASE_URL not reachable");
    return;
  }

  const email = `pwd-dup-${Date.now()}@example.com`;
  try {
    await withPasswordApp(async (app) => {
      await registerWithPassword(app, email, "first-password-value-123");
      await ensurePasswordProtocolReady();
      const { registrationRequest } = passwordProtocol.client.startRegistration({
        password: "second-password-value-456"
      });
      const start = await app.inject({
        method: "POST",
        url: "/auth/password/register/start",
        payload: { email, registrationRequest }
      });
      assert.equal(start.statusCode, 409);
      assert.equal(JSON.stringify(start.json()).toLowerCase().includes("opaque"), false);
    });
  } finally {
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  }
});
