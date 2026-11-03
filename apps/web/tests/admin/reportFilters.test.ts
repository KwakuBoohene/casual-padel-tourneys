import assert from "node:assert/strict";
import test from "node:test";
import {
  adminLink,
  dateInput,
  timestamp,
  rangeParams,
  reportQuery,
  weekRange
} from "../../lib/admin/reportFilters";

const fallback = weekRange(new Date("2026-11-03T12:00:00Z"));
test("Accra weeks begin Monday including Sunday and avoid an empty interval at midnight", () => {
  assert.equal(fallback.get("from"), "2026-11-02T00:00:00.000Z");
  assert.equal(weekRange(new Date("2026-11-08T23:59:00Z")).get("from"), fallback.get("from"));
  const monday = weekRange(new Date("2026-11-02T00:00:00Z"));
  assert.ok(Date.parse(monday.get("to")!) > Date.parse(monday.get("from")!));
});
test("list filters are isolated by endpoint and details preserve URL context without leaking it to other reports", () => {
  const params = new URLSearchParams({
    ...Object.fromEntries(fallback),
    q: "owner@example.test",
    accountType: "registered",
    cursor: "opaque_position",
    mode: "MEXICANO"
  });
  const users = new URLSearchParams(reportQuery("users", params, fallback)!);
  assert.equal(users.get("q"), "owner@example.test");
  assert.equal(users.get("cursor"), "opaque_position");
  assert.equal(users.get("limit"), "25");
  assert.equal(users.has("mode"), false);
  const overview = new URLSearchParams(reportQuery("overview", params, fallback)!);
  assert.equal(overview.has("cursor"), false);
  assert.equal(overview.has("q"), false);
  const link = new URL(
    adminLink("/admin/tournaments", rangeParams(params, fallback), { ownerId: "user_1" }),
    "https://viewer.test"
  );
  assert.equal(link.searchParams.get("from"), fallback.get("from"));
  assert.equal(link.searchParams.get("ownerId"), "user_1");
  assert.equal(link.searchParams.has("q"), false);
});
test("all-history lists omit creation dates and invalid filters fail before requesting", () => {
  const all = new URLSearchParams({ period: "all", verification: "verified" });
  const query = new URLSearchParams(reportQuery("users", all, fallback)!);
  assert.equal(query.has("from"), false);
  assert.equal(query.has("to"), false);
  for (const patch of [
    { from: "invalid" },
    { to: fallback.get("from")! },
    { from: "2020-01-01T00:00:00Z" },
    { verification: "unknown" }
  ] as Record<string, string>[]) {
    assert.equal(
      reportQuery("users", new URLSearchParams({ ...Object.fromEntries(fallback), ...patch }), fallback),
      null
    );
  }
  assert.equal(reportQuery("tournaments", new URLSearchParams({ status: "unknown" }), fallback), null);
});

test("date controls and exact range labels normalize offsets to Accra and retain milliseconds", () => {
  assert.equal(dateInput("2026-11-03T13:00:00.577+01:00"), "2026-11-03T12:00:00.577");
  assert.equal(timestamp("2026-11-03T13:00:00.577+01:00"), "2026-11-03 12:00:00.577 UTC");
  assert.equal(timestamp(null), "Not yet observed");
  assert.equal(dateInput("invalid"), "");
  assert.equal(timestamp("invalid"), "Invalid date");
});
