import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { signAuthToken } from "../../../src/lib/auth.js";
import { registerAppErrorHandler } from "../../../src/shared/http/errorHandler.js";
import { registerAdminModule } from "../../../src/modules/admin/http/register.js";
import { SentryHealth } from "../../../src/modules/admin/application/sentryHealth.js";
import { Ga4Cache } from "../../../src/modules/admin/application/ga4Cache.js";
import { SentryReadError } from "../../../src/modules/admin/application/sentryIssues.js";
import { HttpSentryIssuesClient } from "../../../src/modules/admin/infrastructure/SentryIssuesClient.js";
import { sentryHealthConfig } from "../../../src/modules/admin/infrastructure/sentryHealthConfig.js";

const config = { baseUrl: "https://sentry.io", organization: "fixture", projectIds: ["123"], environment: "production", token: "private-fixture-token", firstSeenVerified: false };
const now = () => new Date("2026-11-11T12:00:00Z");
const range = { from: "2026-11-01T00:00:00Z", to: "2026-11-10T00:00:00Z" };
const issue = (id: string, firstSeen = "2026-11-03T00:00:00Z", project = "123") => ({ id, project: { id: project }, firstSeen });

test("health configuration requires explicit read credentials and fixed project scope", () => {
  const env = { SENTRY_HEALTH_ENABLED: "true", SENTRY_HEALTH_TOKEN: "read-token", SENTRY_HEALTH_ORG: "fixture", SENTRY_HEALTH_PROJECT_IDS: "123,456,123" };
  assert.deepEqual(sentryHealthConfig(env)?.projectIds, ["123", "456"]);
  assert.equal(sentryHealthConfig(env)?.firstSeenVerified, false);
  for (const change of [{ SENTRY_HEALTH_ENABLED: "false" }, { SENTRY_HEALTH_TOKEN: "" }, { SENTRY_HEALTH_PROJECT_IDS: "-1" }, { SENTRY_HEALTH_PROJECT_IDS: "" }, { SENTRY_HEALTH_ENVIRONMENT: "" }, { SENTRY_HEALTH_BASE_URL: "http://sentry.io" }, { SENTRY_HEALTH_BASE_URL: "https://user:pass@sentry.io" }]) {
    assert.equal(sentryHealthConfig({ ...env, ...change }), null);
  }
  assert.equal(sentryHealthConfig({ SENTRY_DSN: "dsn", SENTRY_AUTH_TOKEN: "upload-token" }), null);
});

test("Sentry pagination preserves scope, deduplicates and discards issue details", async () => {
  const calls: URL[] = [];
  const client = new HttpSentryIssuesClient(config, async (input, init) => {
    const url = new URL(String(input)); calls.push(url);
    assert.equal(init?.redirect, "error");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer private-fixture-token");
    assert.ok(init?.signal);
    const json = calls.length === 1 ? [{ ...issue("1"), title: "private exception", email: "private@example.test" }] : [issue("1"), issue("2", "2026-10-01T00:00:00Z")];
    return new Response(JSON.stringify(json), { headers: calls.length === 1 ? { link: '<https://evil.example/?project=-1&cursor=next:100:0>; rel="next"; results="true"' } : {} });
  });
  const report = await new SentryHealth(config, client, undefined, now).summary(range);
  assert.equal(report.data?.observedIssues, 2);
  assert.equal(report.data?.newIssues, null);
  assert.equal(report.data?.regressions, null);
  assert.equal(report.data?.partial, false);
  assert.ok(!/private exception|private@example|private-fixture-token|"project"/.test(JSON.stringify(report)));
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.origin, "https://sentry.io");
    assert.equal(call.pathname, "/api/0/organizations/fixture/issues/");
    assert.deepEqual(call.searchParams.getAll("project"), ["123"]);
    assert.equal(call.searchParams.get("environment"), "production");
    assert.equal(call.searchParams.get("query"), "issue.category:error");
    assert.equal(call.searchParams.get("start"), "2026-11-01T00:00:00.000Z");
  }
});

test("verified first-seen uses an exclusive end; missing timestamps never become zero", async () => {
  const client = { read: async () => ({ issues: [issue("1"), issue("2", range.to), issue("3", "2026-10-30T00:00:00Z")], partial: false }) };
  const service = new SentryHealth({ ...config, firstSeenVerified: true }, client, undefined, now);
  assert.equal((await service.summary(range)).data?.newIssues, 1);
  const missing = new SentryHealth({ ...config, firstSeenVerified: true }, { read: async () => ({ issues: [issue("1", "invalid")], partial: false }) }, undefined, now);
  assert.equal((await missing.summary(range)).data?.newIssues, null);
  const empty = new SentryHealth({ ...config, firstSeenVerified: true }, { read: async () => ({ issues: [], partial: false }) }, undefined, now);
  assert.equal((await empty.summary(range)).data?.newIssues, 0);
  assert.equal((await empty.summary(range)).data?.observedIssues, 0);
});

test("scan bounds, out-of-scope projects and repeated cursors are partial", async () => {
  let calls = 0;
  const client = new HttpSentryIssuesClient(config, async () => {
    calls++;
    return new Response(JSON.stringify([issue(String(calls)), issue("99", undefined, "999")]), { headers: { link: `<https://sentry.io/?cursor=${calls}:100:0>; rel="next"; results="true"` } });
  });
  const scan = await client.read(range.from, range.to);
  assert.equal(calls, 5);
  assert.equal(scan.issues.length, 5);
  assert.equal(scan.partial, true);
  const repeated = new HttpSentryIssuesClient(config, async () => new Response("[]", { headers: { link: '<https://sentry.io/?cursor=0:100:0>; rel="next"; results="true"' } }));
  assert.equal((await repeated.read(range.from, range.to)).partial, true);
});

test("disabled, unauthorized, quota, malformed and provider failures stay local and sanitized", async () => {
  assert.equal((await new SentryHealth(null, null, undefined, now).summary(range)).availability, "not_configured");
  for (const [status, expected] of [[401, "unauthorized"], [403, "unauthorized"], [429, "quota_exceeded"], [500, "unavailable"]] as const) {
    const client = new HttpSentryIssuesClient(config, async () => new Response("private body", { status }));
    const report = await new SentryHealth(config, client, undefined, now).summary(range);
    assert.equal(report.availability, expected);
    assert.equal(report.data, null);
    assert.ok(!JSON.stringify(report).includes("private"));
  }
  for (const body of ["{}", "not json"]) {
    const report = await new SentryHealth(config, new HttpSentryIssuesClient(config, async () => new Response(body)), undefined, now).summary(range);
    assert.equal(report.availability, "unavailable");
  }
});

test("health cache coalesces reads, isolates scopes and serves stale for a bounded period", async () => {
  let clock = now().getTime(), calls = 0, failed = false;
  const client = { read: async () => { calls++; if (failed) throw new SentryReadError("unavailable"); return { issues: [issue("1")], partial: false }; } };
  const cache = new Ga4Cache({ now: () => clock, maxStaleMs: 30 * 60_000 });
  const service = new SentryHealth(config, client, cache, now);
  await Promise.all([service.summary(range), service.summary(range)]);
  assert.equal(calls, 1);
  await new SentryHealth({ ...config, environment: "staging" }, client, cache, now).summary(range);
  assert.equal(calls, 2);
  clock += 6 * 60_000; failed = true;
  const stale = await service.summary(range);
  assert.equal(stale.stale, true);
  assert.equal(stale.availability, "ok");
  assert.equal(stale.fetchedAt, now().toISOString());
  clock += 31 * 60_000;
  assert.equal((await service.summary(range)).availability, "unavailable");
});

test("health route inherits grant, audit, no-store, bounded dates and fixed filters", async () => {
  const prior = { secret: process.env.JWT_SECRET, flag: process.env.ADMIN_PORTAL_ENABLED };
  process.env.JWT_SECRET = "health-test"; process.env.ADMIN_PORTAL_ENABLED = "true";
  let admin = false, calls = 0; const audits: string[] = [];
  const health = new SentryHealth(config, { read: async () => { calls++; return { issues: [], partial: false }; } }, undefined, now);
  const app = Fastify(); registerAppErrorHandler(app);
  registerAdminModule(app, { isAdmin: async () => admin, recordRead: async (_actor, route) => { audits.push(route); } }, undefined, undefined, undefined, health);
  const headers = { authorization: `Bearer ${signAuthToken({ id: "admin", email: "admin@example.test", name: "Admin", isGuest: false })}` };
  try {
    assert.equal((await app.inject({ url: "/admin/health" })).statusCode, 401);
    assert.equal((await app.inject({ url: "/admin/health", headers })).statusCode, 403);
    assert.equal(calls, 0); admin = true;
    const result = await app.inject({ url: `/admin/health?${new URLSearchParams(range)}`, headers });
    assert.equal(result.statusCode, 200);
    assert.equal(result.headers["cache-control"], "no-store");
    assert.ok(audits.includes("/admin/health"));
    for (const query of ["from=bad", "project=-1", "environment=staging", "from=2026-11-12T00:00:00Z&to=2026-11-13T00:00:00Z", "from=2020-01-01T00:00:00Z&to=2026-11-10T00:00:00Z"]) {
      assert.equal((await app.inject({ url: `/admin/health?${query}`, headers })).statusCode, 400);
    }
    assert.equal(calls, 1);
  } finally {
    await app.close();
    if (prior.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = prior.secret;
    if (prior.flag === undefined) delete process.env.ADMIN_PORTAL_ENABLED; else process.env.ADMIN_PORTAL_ENABLED = prior.flag;
  }
});

test("rolling current windows reuse one snapshot and retain its actual end time", async () => {
  let time = new Date("2026-11-11T12:01:00Z"), calls = 0, failed = false;
  const cache = new Ga4Cache({ now: () => time.getTime(), maxStaleMs: 30 * 60_000 });
  const service = new SentryHealth(config, { read: async () => { calls++; if (failed) throw new SentryReadError("unavailable"); return { issues: [], partial: false }; } }, cache, () => time);
  const first = await service.summary({});
  time = new Date("2026-11-11T12:02:00Z");
  const second = await service.summary({});
  assert.equal(calls, 1);
  assert.deepEqual(second.window, first.window);
  assert.equal(second.window.to, "2026-11-11T12:01:00.000Z");
  time = new Date("2026-11-11T12:07:00Z");
  failed = true;
  const stale = await service.summary({});
  assert.equal(calls, 2);
  assert.equal(stale.stale, true);
  assert.deepEqual(stale.window, first.window);
  time = new Date("2026-11-11T12:08:00Z");
  failed = false;
  const refreshed = await service.summary({});
  assert.equal(calls, 3);
  assert.equal(refreshed.stale, false);
  assert.equal(refreshed.window.to, time.toISOString());
  // An explicit future end remains a separate scope as the effective end advances.
  const future = { to: "2026-11-12T00:00:00Z" };
  const fixed = await service.summary(future);
  time = new Date("2026-11-11T12:14:00Z");
  failed = true;
  assert.deepEqual((await service.summary(future)).window, fixed.window);
});
