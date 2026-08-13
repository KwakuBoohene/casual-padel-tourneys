import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../../src/app.js";
import type { MailMessage } from "../../src/lib/mail/index.js";
import { setMailerOverride } from "../../src/lib/mail/index.js";
import { hashMagicToken } from "../../src/lib/magicTokens.js";
import { clearPasswordLoginAttempts } from "../../src/lib/passwordLoginAttempts.js";
import {
  ensurePasswordProtocolReady,
  passwordProtocol
} from "../../src/lib/passwordProtocol.js";
import { clearPasswordResetTickets } from "../../src/lib/passwordResetTickets.js";
import { prisma } from "../../src/lib/prisma.js";

const JWT_SECRET = "test-secret-key-for-password-reset";

async function dbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

function rawTokenFromMail(message: MailMessage | null): string {
  assert.ok(message?.text);
  const match = message.text.match(/token=([^\s&]+)/);
  assert.ok(match?.[1], "expected token in email body");
  return decodeURIComponent(match[1]);
}

type CapturingMailer = {
  last: MailMessage | null;
  send: (message: MailMessage) => Promise<void>;
};

async function withResetApp<T>(
  fn: (app: Awaited<ReturnType<typeof createApp>>, mailer: CapturingMailer) => Promise<T>
): Promise<T> {
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
  clearPasswordResetTickets();

  const mailer: CapturingMailer = {
    last: null,
    async send(message: MailMessage) {
      mailer.last = message;
    }
  };
  setMailerOverride(mailer);

  const app = await createApp();
  try {
    return await fn(app, mailer);
  } finally {
    setMailerOverride(null);
    clearPasswordLoginAttempts();
    clearPasswordResetTickets();
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

  let finishLoginRequest: string;
  try {
    ({ finishLoginRequest } = passwordProtocol.client.finishLogin({
      clientLoginState,
      loginResponse,
      password
    }));
  } catch {
    return { statusCode: 401, body: { message: "client finish failed" } };
  }

  const finish = await app.inject({
    method: "POST",
    url: "/auth/password/login/finish",
    payload: { email, loginId, finishLoginRequest }
  });
  return { statusCode: finish.statusCode, body: finish.json() };
}

async function completePasswordReset(
  app: Awaited<ReturnType<typeof createApp>>,
  resetTicket: string,
  password: string
): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  await ensurePasswordProtocolReady();
  const { clientRegistrationState, registrationRequest } = passwordProtocol.client.startRegistration({
    password
  });

  const start = await app.inject({
    method: "POST",
    url: "/auth/password/reset/register/start",
    payload: { resetTicket, registrationRequest }
  });
  if (start.statusCode !== 200) {
    return { statusCode: start.statusCode, body: start.json() };
  }
  const { registrationResponse } = start.json();

  const { registrationRecord } = passwordProtocol.client.finishRegistration({
    clientRegistrationState,
    registrationResponse,
    password
  });

  const finish = await app.inject({
    method: "POST",
    url: "/auth/password/reset/register/finish",
    payload: { resetTicket, registrationRecord }
  });
  return { statusCode: finish.statusCode, body: finish.json() };
}

test("password reset: always 200 for unknown email; no mail", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("database unavailable");
    return;
  }

  await withResetApp(async (app, mailer) => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email: `nobody-${Date.now()}@example.com` }
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.json().message, /password reset link/i);
    assert.equal(mailer.last, null);
  });
});

test("password reset: old password fails after replace; new password works", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("database unavailable");
    return;
  }

  const email = `reset-${Date.now()}@example.com`;
  const oldPassword = "old-password-value-1";
  const newPassword = "new-password-value-2";

  await withResetApp(async (app, mailer) => {
    await registerWithPassword(app, email, oldPassword);

    const before = await loginWithPassword(app, email, oldPassword);
    assert.equal(before.statusCode, 200, JSON.stringify(before.body));

    const request = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email }
    });
    assert.equal(request.statusCode, 200);

    const rawToken = rawTokenFromMail(mailer.last);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const tokenRow = await prisma.magicLinkToken.findFirst({
      where: { userId: user.id, purpose: "RESET" },
      orderBy: { createdAt: "desc" }
    });
    assert.ok(tokenRow);
    assert.equal(tokenRow.tokenHash, hashMagicToken(rawToken));

    const consume = await app.inject({
      method: "POST",
      url: "/auth/password/reset/consume",
      payload: { token: rawToken }
    });
    assert.equal(consume.statusCode, 200, consume.body);
    const { resetTicket } = consume.json();
    assert.ok(typeof resetTicket === "string" && resetTicket.length >= 8);
    assert.equal(consume.json().token, undefined);

    const reuseConsume = await app.inject({
      method: "POST",
      url: "/auth/password/reset/consume",
      payload: { token: rawToken }
    });
    assert.equal(reuseConsume.statusCode, 401);

    const reset = await completePasswordReset(app, resetTicket, newPassword);
    assert.equal(reset.statusCode, 200, JSON.stringify(reset.body));
    assert.ok(typeof reset.body.token === "string");
    const claims = jwt.verify(reset.body.token as string, JWT_SECRET) as jwt.JwtPayload;
    assert.equal(claims.sub, user.id);
    assert.equal(claims.emailVerified, true);

    const oldLogin = await loginWithPassword(app, email, oldPassword);
    assert.equal(oldLogin.statusCode, 401);

    const newLogin = await loginWithPassword(app, email, newPassword);
    assert.equal(newLogin.statusCode, 200, JSON.stringify(newLogin.body));

    const ticketReuse = await completePasswordReset(app, resetTicket, "another-password");
    assert.equal(ticketReuse.statusCode, 401);
  });
});

test("password reset: first-time password set when no prior envelope", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("database unavailable");
    return;
  }

  const email = `reset-magic-only-${Date.now()}@example.com`;
  const password = "first-password-after-reset";

  await withResetApp(async (app, mailer) => {
    await prisma.user.create({
      data: {
        email,
        name: "Magic Only",
        isGuest: false,
        emailVerifiedAt: new Date()
      }
    });

    const request = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: { email }
    });
    assert.equal(request.statusCode, 200);

    const consume = await app.inject({
      method: "POST",
      url: "/auth/password/reset/consume",
      payload: { token: rawTokenFromMail(mailer.last) }
    });
    assert.equal(consume.statusCode, 200, consume.body);

    const reset = await completePasswordReset(app, consume.json().resetTicket, password);
    assert.equal(reset.statusCode, 200, JSON.stringify(reset.body));

    const login = await loginWithPassword(app, email, password);
    assert.equal(login.statusCode, 200, JSON.stringify(login.body));
  });
});

test("password reset: API errors never mention OPAQUE", async (t) => {
  if (!(await dbAvailable())) {
    t.skip("database unavailable");
    return;
  }

  await withResetApp(async (app) => {
    const consume = await app.inject({
      method: "POST",
      url: "/auth/password/reset/consume",
      payload: { token: "not-a-real-token-abcdefghijklmnop" }
    });
    assert.equal(consume.statusCode, 401);
    assert.doesNotMatch(JSON.stringify(consume.json()).toLowerCase(), /opaque/);

    const start = await app.inject({
      method: "POST",
      url: "/auth/password/reset/register/start",
      payload: {
        resetTicket: "bogus-ticket-value",
        registrationRequest: "x".repeat(40)
      }
    });
    assert.equal(start.statusCode, 401);
    assert.doesNotMatch(JSON.stringify(start.json()).toLowerCase(), /opaque/);
  });
});
