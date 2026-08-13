import test from "node:test";
import assert from "node:assert/strict";

import { ConsoleMailer } from "./consoleMailer.js";
import { createMailerFromEnv } from "./index.js";
import { MailgunMailer } from "./mailgunMailer.js";

test("createMailerFromEnv defaults to console outside production", () => {
  const previous = process.env.MAIL_PROVIDER;
  const previousNode = process.env.NODE_ENV;
  delete process.env.MAIL_PROVIDER;
  process.env.NODE_ENV = "test";
  try {
    const mailer = createMailerFromEnv();
    assert.ok(mailer instanceof ConsoleMailer);
  } finally {
    if (previous === undefined) delete process.env.MAIL_PROVIDER;
    else process.env.MAIL_PROVIDER = previous;
    if (previousNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNode;
  }
});

test("createMailerFromEnv builds MailgunMailer when configured", () => {
  const previous = {
    MAIL_PROVIDER: process.env.MAIL_PROVIDER,
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
    MAIL_FROM: process.env.MAIL_FROM
  };
  process.env.MAIL_PROVIDER = "mailgun";
  process.env.MAILGUN_API_KEY = "key-test";
  process.env.MAILGUN_DOMAIN = "mg.example.com";
  process.env.MAIL_FROM = "Padel <noreply@example.com>";
  try {
    const mailer = createMailerFromEnv();
    assert.ok(mailer instanceof MailgunMailer);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("MailgunMailer posts form body without throwing on 200", async () => {
  const originalFetch = globalThis.fetch;
  let sawAuth = false;
  globalThis.fetch = (async (_url, init) => {
    const headers = init?.headers as Record<string, string>;
    sawAuth = Boolean(headers?.Authorization?.startsWith("Basic "));
    assert.equal(headers?.Authorization.includes("key-test"), false);
    return new Response(JSON.stringify({ id: "<msg>" }), { status: 200 });
  }) as typeof fetch;

  try {
    const mailer = new MailgunMailer({
      apiKey: "key-test",
      domain: "mg.example.com",
      from: "Padel <noreply@example.com>"
    });
    await mailer.send({
      to: "player@example.com",
      subject: "Hello",
      text: "Body"
    });
    assert.equal(sawAuth, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unknown MAIL_PROVIDER throws", () => {
  const previous = process.env.MAIL_PROVIDER;
  process.env.MAIL_PROVIDER = "sendgrid";
  try {
    assert.throws(() => createMailerFromEnv(), /Unsupported MAIL_PROVIDER/);
  } finally {
    if (previous === undefined) delete process.env.MAIL_PROVIDER;
    else process.env.MAIL_PROVIDER = previous;
  }
});
