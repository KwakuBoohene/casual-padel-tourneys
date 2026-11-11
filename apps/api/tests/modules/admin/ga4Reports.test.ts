import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { signAuthToken } from "../../../src/lib/auth.js";
import { registerAppErrorHandler } from "../../../src/shared/http/errorHandler.js";
import { registerAdminModule } from "../../../src/modules/admin/http/register.js";
import { ga4Window } from "../../../src/modules/admin/domain/ga4Window.js";
import { Ga4Cache } from "../../../src/modules/admin/application/ga4Cache.js";
import { Ga4Reports } from "../../../src/modules/admin/application/ga4Reports.js";
import {
  Ga4ProviderError,
  type Ga4DataClient,
  type Ga4ReportRequest,
  type Ga4ReportResponse
} from "../../../src/modules/admin/application/ga4DataClient.js";
import { ga4ReportingConfig } from "../../../src/modules/admin/infrastructure/ga4ReportingConfig.js";

const NOW = new Date("2026-11-11T12:00:00Z");
const row = (dimensions: string[], metrics: (string | number)[]) => ({
  dimensionValues: dimensions.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value: String(value) }))
});

class FakeClient implements Ga4DataClient {
  calls: { method: string; property: string; requests: Ga4ReportRequest[] }[] = [];
  failWith: Ga4ProviderError | null = null;
  pageTypeFails = false;
  empty = false;
  async batchRunReports(property: string, requests: Ga4ReportRequest[]): Promise<Ga4ReportResponse[]> {
    this.calls.push({ method: "batch", property, requests });
    if (this.failWith) throw this.failWith;
    if (this.empty) return requests.map(() => ({}));
    return [
      { rows: [row(["date_range_0"], [40, 55, 120, 0.62]), row(["date_range_1"], [30, 44, 90, 0.5])] },
      { rows: [row(["20261109"], [20]), row(["20261111"], [35])] },
      { rows: [row(["Direct"], [10]), row(["Organic Search"], [30]), row(["Weird"], [5]), row(["(not set)"], [10])] },
      { rows: [row(["mobile"], [40]), row(["desktop"], [10]), row(["smart tv"], [5])] },
      { rows: [row(["20261106"], [18]), row(["20261108"], [26])] }
    ];
  }
  async runReport(property: string, request: Ga4ReportRequest): Promise<Ga4ReportResponse> {
    this.calls.push({ method: "report", property, requests: [request] });
    if (this.pageTypeFails) throw new Ga4ProviderError("invalid", "dimension missing");
    return { rows: [row(["scoreboard"], [90]), row(["leaderboard"], [20]), row(["PRIVATE-TOKEN"], [10])] };
  }
  async runRealtimeReport(property: string): Promise<Ga4ReportResponse> {
    this.calls.push({ method: "realtime", property, requests: [] });
    if (this.failWith) throw this.failWith;
    return { rows: [row([], [7])] };
  }
}

const reports = (client: FakeClient | null, extra: Partial<ConstructorParameters<typeof Ga4Reports>[0]> = {}) =>
  new Ga4Reports({
    client,
    properties: { viewer: "111111", organizer: "222222" },
    environment: "test",
    now: () => NOW,
    ...extra
  });

test("Accra dates are inclusive GA4 dates with an equal-length previous window", () => {
  const window = ga4Window({ from: "2026-11-02T00:00:00Z", to: "2026-11-05T00:00:00Z" }, NOW);
  // `to` is exclusive in the app, so midnight on the 5th ends on the 4th.
  assert.deepEqual([window.from, window.to, window.days], ["2026-11-02", "2026-11-04", 3]);
  assert.deepEqual([window.previousFrom, window.previousTo], ["2026-10-30", "2026-11-01"]);
  assert.equal(window.provisional, false);
  const week = ga4Window({}, NOW);
  assert.deepEqual([week.from, week.to, week.days, week.provisional], ["2026-11-09", "2026-11-11", 3, true]);
  assert.equal(ga4Window({ from: "2026-11-01T00:00:00Z", to: "2026-12-30T00:00:00Z" }, NOW).to, "2026-11-11");
});

test("viewer report maps provider data, fills day gaps and buckets unknown values", async () => {
  const client = new FakeClient();
  const result = await reports(client).viewer({ from: "2026-11-09T00:00:00Z", to: "2026-11-12T00:00:00Z" });
  assert.equal(result.availability, "ok");
  assert.deepEqual(result.window && [result.window.from, result.window.to], ["2026-11-09", "2026-11-11"]);
  const data = result.data!;
  assert.deepEqual(data.totals.current, { activeUsers: 40, sessions: 55, views: 120, engagementRate: 0.62 });
  assert.equal(data.totals.previous.sessions, 44);
  assert.deepEqual(data.daily, [
    { date: "2026-11-09", sessions: 20 },
    { date: "2026-11-10", sessions: 0 },
    { date: "2026-11-11", sessions: 35 }
  ]);
  assert.deepEqual(data.previousDaily, [
    { date: "2026-11-06", sessions: 18 },
    { date: "2026-11-07", sessions: 0 },
    { date: "2026-11-08", sessions: 26 }
  ]);
  assert.equal(client.calls[0].requests.length, 5);
  assert.deepEqual(client.calls[0].requests[4].dateRanges, [
    { startDate: "2026-11-06", endDate: "2026-11-08" }
  ]);
  assert.deepEqual(data.channels.map((c) => [c.channel, c.sessions]), [
    ["Organic Search", 30], ["Direct", 10], ["Unassigned", 10], ["Other", 5]
  ]);
  assert.deepEqual(data.devices.at(-1), { device: "other", sessions: 5 });
  assert.deepEqual(data.pageTypes, [
    { page: "scoreboard", views: 90 }, { page: "leaderboard", views: 20 }, { page: "other", views: 10 }
  ]);
  assert.ok(!JSON.stringify(result).includes("PRIVATE-TOKEN"));
  const [totals] = client.calls[0].requests;
  assert.deepEqual(totals.dateRanges, [
    { startDate: "2026-11-09", endDate: "2026-11-11" },
    { startDate: "2026-11-06", endDate: "2026-11-08" }
  ]);
  assert.equal(client.calls[0].property, "111111");
});

test("a valid report with no rows is a true zero, and a missing page_type dimension degrades only that section", async () => {
  const client = new FakeClient();
  client.empty = true;
  client.pageTypeFails = true;
  const result = await reports(client).viewer({});
  assert.equal(result.availability, "ok");
  assert.deepEqual(result.data!.totals.current, { activeUsers: 0, sessions: 0, views: 0, engagementRate: null });
  assert.equal(result.data!.daily.every((point) => point.sessions === 0), true);
  assert.equal(result.data!.pageTypes, null);
  assert.ok(result.notes.some((note) => note.includes("page_type")));
});

test("results are cached per property and shape, concurrent requests share one fetch", async () => {
  const client = new FakeClient();
  const service = reports(client);
  const [a, b] = await Promise.all([service.viewer({}), service.viewer({})]);
  assert.equal(a.fetchedAt, b.fetchedAt);
  await service.viewer({});
  assert.equal(client.calls.filter((c) => c.method === "batch").length, 1);
  await service.viewer({ from: "2026-11-01T00:00:00Z", to: "2026-11-05T00:00:00Z" });
  assert.equal(client.calls.filter((c) => c.method === "batch").length, 2);
  // A second service sharing the cache but pointed at another property must not reuse entries.
  const cache = new Ga4Cache();
  await reports(client, { cache }).viewer({});
  await reports(client, { cache, properties: { viewer: "333333" } }).viewer({});
  assert.equal(client.calls.filter((c) => c.method === "batch").at(-1)!.property, "333333");
});

test("historical and realtime results expire independently", async () => {
  let clock = 0;
  const client = new FakeClient();
  const service = reports(client, { cache: new Ga4Cache({ now: () => clock }) });
  await service.viewer({});
  await service.viewerRealtime();
  clock = 90_000; // realtime (60s) is stale, historical (15m) is not
  await service.viewer({});
  const realtime = await service.viewerRealtime();
  assert.deepEqual(realtime.data, { activeUsers: 7, windowMinutes: 30 });
  assert.equal(realtime.window, null);
  assert.equal(client.calls.filter((c) => c.method === "batch").length, 1);
  assert.equal(client.calls.filter((c) => c.method === "realtime").length, 2);
});

test("missing configuration, quota and provider failures are explicit and never throw", async () => {
  const none = await reports(null).viewer({});
  assert.deepEqual([none.availability, none.data], ["not_configured", null]);
  assert.equal((await reports(new FakeClient(), { properties: {} }).viewerRealtime()).availability, "not_configured");

  const quota = new FakeClient();
  quota.failWith = new Ga4ProviderError("quota", "limit");
  assert.equal((await reports(quota).viewer({})).availability, "quota_exceeded");
  const failed = new FakeClient();
  failed.failWith = new Ga4ProviderError("failed", "boom");
  assert.equal((await reports(failed).viewerRealtime()).availability, "unavailable");
});

test("a failed refresh serves the last good result as stale and failures are not retried immediately", async () => {
  let clock = 0;
  const client = new FakeClient();
  const service = reports(client, { cache: new Ga4Cache({ now: () => clock }) });
  const first = await service.viewer({});
  clock = 20 * 60_000;
  client.failWith = new Ga4ProviderError("failed", "outage");
  const stale = await service.viewer({});
  assert.deepEqual([stale.availability, stale.stale, stale.fetchedAt], ["ok", true, first.fetchedAt]);
  const before = client.calls.length;
  await service.viewer({});
  assert.equal(client.calls.length, before);
});

test("reporting config needs explicit enablement, a key, and distinct valid property IDs", () => {
  const key = JSON.stringify({ client_email: "svc@example.iam", private_key: "fixture-key" });
  const base = { GA4_REPORTING_ENABLED: "true", GA4_REPORTING_CREDENTIALS_JSON: key, GA4_VIEWER_PROPERTY_ID: "123456" };
  assert.ok(ga4ReportingConfig(base));
  assert.equal(ga4ReportingConfig({ ...base, GA4_REPORTING_ENABLED: "false" }), null);
  assert.equal(ga4ReportingConfig({ ...base, GA4_REPORTING_CREDENTIALS_JSON: "{not json" }), null);
  assert.equal(ga4ReportingConfig({ ...base, GA4_VIEWER_PROPERTY_ID: "properties/123" }), null);
  assert.equal(ga4ReportingConfig({ ...base, GA4_ORGANIZER_PROPERTY_ID: "123456" }), null);
});

test("GA4 routes inherit the admin guard and never expose credentials or property IDs", async () => {
  const old = { secret: process.env.JWT_SECRET, flag: process.env.ADMIN_PORTAL_ENABLED };
  process.env.JWT_SECRET = "ga4-route-fixture";
  process.env.ADMIN_PORTAL_ENABLED = "true";
  const client = new FakeClient();
  let admin = false;
  const app = Fastify();
  registerAppErrorHandler(app);
  registerAdminModule(
    app,
    { isAdmin: async () => admin, recordRead: async () => undefined },
    undefined,
    undefined,
    reports(client)
  );
  const token = signAuthToken({ id: "admin-1", email: "a@example.test", name: "Admin", isGuest: false });
  const headers = { authorization: `Bearer ${token}` };
  try {
    for (const url of ["/admin/ga4/viewer", "/admin/ga4/viewer/realtime", "/admin/ga4/organizer"]) {
      assert.equal((await app.inject({ url })).statusCode, 401);
      assert.equal((await app.inject({ url, headers })).statusCode, 403);
    }
    assert.equal(client.calls.length, 0);
    admin = true;
    const ok = await app.inject({ url: "/admin/ga4/viewer", headers });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.headers["cache-control"], "no-store");
    assert.ok(!/111111|222222|private_key|client_email/.test(ok.body));
    const organizer = await app.inject({ url: "/admin/ga4/organizer", headers });
    assert.equal(organizer.statusCode, 200);
    assert.equal(organizer.json().surface, "organizer");
    assert.equal((await app.inject({ url: "/admin/ga4/organizer?property=111111", headers })).statusCode, 400);
    assert.equal(client.calls.at(-1)?.property, "222222");
    assert.ok(!/111111|222222|private_key|client_email/.test(organizer.body));
    assert.equal((await app.inject({ url: "/admin/ga4/organizer?from=bad", headers })).statusCode, 400);
    assert.equal((await app.inject({ url: "/admin/ga4/viewer?from=bad", headers })).statusCode, 400);
    assert.equal((await app.inject({ url: "/admin/ga4/viewer/realtime?property=222222", headers })).statusCode, 400);
    assert.equal((await app.inject({ url: "/admin/ga4/viewer/realtime", headers })).statusCode, 200);
  } finally {
    await app.close();
    for (const [name, value] of [["JWT_SECRET", old.secret], ["ADMIN_PORTAL_ENABLED", old.flag]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

class OrganizerClient extends FakeClient {
  featureFails = false;
  stepFails = false;
  partial = false;
  async batchRunReports(property: string, requests: Ga4ReportRequest[]): Promise<Ga4ReportResponse[]> {
    const viewer = await super.batchRunReports(property, requests);
    if (requests[4]?.dimensions?.[0]?.name !== "eventName" || this.empty) return viewer;
    return [viewer[0], viewer[1], viewer[3], viewer[4], {
      rows: [row(["creation_started"], [12]), row(["creation_step_reached"], [38]), row(["creation_succeeded"], [15])],
      metadata: { subjectToThresholding: this.partial }
    }];
  }
  async runReport(property: string, request: Ga4ReportRequest): Promise<Ga4ReportResponse> {
    const fallback = await super.runReport(property, request);
    if (this.empty) return {};
    if (request.dimensions?.[0]?.name === "customEvent:feature_area") {
      if (this.featureFails) throw new Ga4ProviderError("invalid", "secret provider failure");
      return { rows: [row(["setup"], [40, 8]), row(["live_scoring"], [20, 8]), row(["PRIVATE-TOKEN"], [99, 99])] };
    }
    if (request.dimensions?.[0]?.name === "customEvent:creation_step") {
      if (this.stepFails) throw new Ga4ProviderError("failed", "secret provider failure");
      return { rows: [row(["review"], [16]), row(["name"], [22]), row(["PRIVATE-TOKEN"], [99])] };
    }
    return fallback;
  }
}

test("organizer reports use their fixed property, safe labels, provider totals and independent milestone counts", async () => {
  const client = new OrganizerClient();
  const service = reports(client);
  const result = await service.organizer({});
  assert.equal(result.surface, "organizer");
  assert.equal(result.availability, "ok");
  const data = result.data!;
  assert.equal(data.totals.current.activeUsers, 40);
  assert.equal(data.totals.previous.sessions, 44);
  assert.deepEqual(data.daily.map((point) => point.sessions), [20, 0, 35]);
  assert.deepEqual(data.previousDaily.map((point) => point.sessions), [18, 0, 26]);
  assert.equal(data.devices.at(-1)?.device, "other");
  assert.deepEqual(data.features, [
    { feature: "setup", views: 40, activeUsers: 8 },
    { feature: "live_scoring", views: 20, activeUsers: 8 }
  ]);
  assert.deepEqual(data.milestones.map((point) => point.count), [12, 38, 15]); // Repeats can exceed starts.
  assert.equal(data.creationSteps?.find((point) => point.step === "review")?.count, 16);
  assert.equal(data.creationSteps?.find((point) => point.step === "courts")?.count, 0);
  assert.ok(!JSON.stringify(result).includes("PRIVATE-TOKEN"));
  assert.ok(result.notes.some((note) => note.includes("not an ordered funnel")));
  assert.ok(client.calls.every((call) => call.property === "222222"));
  assert.equal(client.calls[0].requests.length, 5);
  assert.ok(client.calls[1].requests[0].dimensionFilter);
  await service.organizer({});
  assert.equal(client.calls.length, 3); // All seven report shapes are cached together.
  await service.viewer({});
  assert.equal(client.calls[3].property, "111111");
});

test("missing Organizer dimensions degrade independently while empty and thresholded data remain explicit", async () => {
  const client = new OrganizerClient();
  client.featureFails = true;
  const result = await reports(client).organizer({});
  assert.equal(result.availability, "ok");
  assert.equal(result.data?.features, null);
  assert.ok(result.data?.creationSteps);
  assert.ok(!JSON.stringify(result).includes("secret provider failure"));
  client.stepFails = true;
  client.partial = true;
  const partial = await reports(client).organizer({});
  assert.equal(partial.data?.creationSteps, null);
  assert.equal(partial.data?.partial, true);
  client.empty = true;
  const empty = await reports(client).organizer({});
  assert.deepEqual(empty.data?.features, []);
  assert.ok(empty.data?.milestones.every((point) => point.count === 0));
  assert.ok(empty.data?.creationSteps?.every((point) => point.count === 0));
  assert.equal(empty.data?.totals.current.activeUsers, 0);
});

test("Organizer configuration, failures and stale cache are isolated from Viewer reports", async () => {
  const client = new OrganizerClient();
  assert.equal((await reports(client, { properties: { viewer: "111111" } }).organizer({})).availability, "not_configured");
  assert.equal(client.calls.length, 0);
  client.failWith = new Ga4ProviderError("quota", "private quota detail");
  assert.equal((await reports(client).organizer({})).availability, "quota_exceeded");
  client.failWith = new Ga4ProviderError("failed", "private provider detail");
  assert.equal((await reports(client).organizer({})).availability, "unavailable");
  client.failWith = null;
  let clock = 0;
  const cache = new Ga4Cache({ now: () => clock });
  const service = reports(client, { cache });
  const first = await service.organizer({});
  clock = 20 * 60_000;
  client.failWith = new Ga4ProviderError("failed", "outage");
  const stale = await service.organizer({});
  assert.deepEqual([stale.availability, stale.stale, stale.fetchedAt], ["ok", true, first.fetchedAt]);
  assert.deepEqual(stale.data, first.data);
});
