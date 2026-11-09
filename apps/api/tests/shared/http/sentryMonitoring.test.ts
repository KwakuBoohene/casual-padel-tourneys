import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import * as Sentry from "@sentry/node";
import { initSentry, sanitizeEvent, traceRate } from "../../../src/lib/sentry.js";
import { registerSentryMonitoring } from "../../../src/shared/http/sentryMonitoring.js";
import { mapAppError, AppError } from "../../../src/shared/http/mapAppError.js";

test("diagnostics allowlist removes arbitrary messages, identities, and request data", () => {
  const clean = sanitizeEvent({
    type: undefined, request: { url: "https://host/public/SECRET?token=SECRET" },
    message: "Ama ama@example.com SECRET", user: { id: "forged", email: "ama@example.com" },
    extra: { password: "SECRET" }, breadcrumbs: [{ message: "SECRET" }],
    exception: { values: [{ value: "Ama SECRET", stacktrace: { frames: [{
      filename: "/app/src/routes.ts?token=SECRET", context_line: "SECRET", vars: { name: "Ama" }, lineno: 42
    }] } }] }
  });
  const json = JSON.stringify(clean);
  for (const value of ["SECRET", "Ama", "example.com", "password", "forged"]) assert.ok(!json.includes(value));
  assert.equal(clean.exception?.values?.[0].stacktrace?.frames?.[0].lineno, 42);
});

test("trace sampling rejects invalid configuration", () => {
  assert.equal(traceRate(undefined), 0.1);
  assert.equal(traceRate("0"), 0);
  for (const value of ["NaN", "-1", "2"]) assert.equal(traceRate(value), 0);
});

test("no DSN leaves SDK uninitialized", () => {
  delete process.env.SENTRY_DSN;
  initSentry();
  assert.equal(Sentry.isInitialized(), false);
});

test("unexpected failures report once, expected failures do not, request spans finish", async () => {
  const envelopes: unknown[] = [];
  Sentry.init({
    traceLifecycle: "static",
    dsn: "https://public@example.com/1", defaultIntegrations: false,
    tracesSampleRate: 1, beforeSend: sanitizeEvent,
    transport: () => ({ send: async (envelope) => { envelopes.push(envelope); return {}; }, flush: async () => true })
  });
  const app = Fastify();
  registerSentryMonitoring(app);
  app.get("/unexpected", async () => { throw new Error("private message"); });
  app.get("/expected", async () => { throw Object.assign(new Error("invalid"), { statusCode: 400 }); });
  app.get("/mapped", async (_request, reply) => mapAppError(reply, new AppError("INTERNAL", 500, "private")));
  try {
    assert.equal((await app.inject("/unexpected")).statusCode, 500);
    assert.equal((await app.inject("/expected")).statusCode, 400);
    assert.equal((await app.inject("/mapped")).statusCode, 500);
    await Sentry.flush(2000);
    const items = envelopes.flatMap((envelope) => (envelope as [unknown, [Record<string, unknown>, unknown][]])[1]);
    assert.equal(items.filter(([header]) => header.type === "event").length, 2);
    assert.equal(items.filter(([header]) => header.type === "transaction").length, 3);
    assert.ok(!JSON.stringify(envelopes).includes("private message"));
  } finally {
    await app.close();
    await Sentry.close();
  }
});
