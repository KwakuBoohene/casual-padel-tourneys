import assert from "node:assert/strict";
import test from "node:test";
import { usageBatchSchema, usageRoute, visitTransition, USAGE_SESSION_MS } from "../../src/index.js";
const id = "123e4567-e89b-42d3-a456-426614174000";
test("visit contract excludes public viewer tracking, attribution claims and URL payloads", () => {
  const valid = {
    consent: true,
    surface: "organizer",
    events: [{ id, sessionId: id, route: "tournament", occurredAt: "2026-11-04T12:00:00Z" }]
  };
  assert.ok(usageBatchSchema.safeParse(valid).success);
  for (const patch of [
    { surface: "viewer" },
    { consent: false },
    { actorUserId: "spoof" },
    { events: Array(21).fill(valid.events[0]) },
    { events: [{ ...valid.events[0], route: "/tournaments/SECRET?token=SECRET" }] }
  ])
    assert.equal(usageBatchSchema.safeParse({ ...valid, ...patch }).success, false);
});
test("route normalization removes capabilities and excludes callbacks, admin and unknown screens", () => {
  assert.equal(usageRoute("/tournaments/SECRET/leaderboard?token=SECRET#SECRET"), "leaderboard");
  for (const path of [
    "/admin",
    "/auth/magic",
    "/sign-in",
    "/profile/attach",
    "/health",
    "/usage/visits",
    "/c/SECRET",
    "/tournament/SECRET"
  ])
    assert.equal(usageRoute(path), null);
});
test("activity renews inactivity sessions; exact boundary and account switches rotate them", () => {
  const first = visitTransition(null, { now: 100, id, route: "home", actor: "a" });
  assert.ok(first.emit);
  const touch = visitTransition(first.session, {
    now: 100 + USAGE_SESSION_MS - 1,
    id: "next",
    route: "home",
    actor: "a"
  });
  assert.equal(touch.emit, false);
  assert.equal(touch.session.id, id);
  const expired = visitTransition(touch.session, {
    now: touch.session.lastAt + USAGE_SESSION_MS,
    id: "next",
    route: "home",
    actor: "a"
  });
  assert.ok(expired.emit);
  assert.equal(expired.session.id, "next");
  const switched = visitTransition(touch.session, {
    now: touch.session.lastAt + 1,
    id: "other",
    route: "home",
    actor: "b"
  });
  assert.equal(switched.session.id, "other");
});
