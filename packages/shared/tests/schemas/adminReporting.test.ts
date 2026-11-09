import test from "node:test";
import assert from "node:assert/strict";
import {
  adminUsersQuerySchema,
  adminOverviewQuerySchema,
  adminTournamentsQuerySchema
} from "../../src/schemas/adminReporting.js";

test("admin reporting bounds page size, query fields, sort and date intervals", () => {
  assert.equal(adminUsersQuerySchema.parse({}).limit, 25);
  assert.equal(adminUsersQuerySchema.parse({ limit: "100" }).limit, 100);
  assert.ok(adminUsersQuerySchema.safeParse({ q: "a".repeat(254) }).success);
  assert.equal(adminUsersQuerySchema.safeParse({ q: "a".repeat(255) }).success, false);
  for (const input of [
    { limit: 101 },
    { limit: 0 },
    { sort: "email" },
    { password: "x" },
    { cursor: "not valid!" },
    { q: " " }
  ])
    assert.equal(adminUsersQuerySchema.safeParse(input).success, false);
  for (const input of [
    { from: "2026-11-02T00:00:00Z" },
    { from: "2026-11-02T00:00:00Z", to: "2026-11-02T00:00:00Z" },
    { from: "2025-01-01T00:00:00Z", to: "2026-01-03T00:00:00Z" }
  ])
    assert.equal(adminOverviewQuerySchema.safeParse(input).success, false);
  assert.ok(
    adminOverviewQuerySchema.safeParse({ from: "2025-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" }).success
  );
  assert.equal(adminTournamentsQuerySchema.safeParse({ mode: "OTHER" }).success, false);
});
