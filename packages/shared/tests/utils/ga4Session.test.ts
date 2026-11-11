import assert from "node:assert/strict";
import { test } from "node:test";
import { createGa4Consent } from "../../src/utils/ga4Session.js";

test("GA4 consent is explicit, scoped, and revocable even if storage becomes read-only", () => {
  const saved = new Map<string, string>();
  const session = new Map<string, string>();
  let writable = true;
  let now = 1_720_000_000_000;
  const store = (map: Map<string, string>) => ({
    get: (key: string) => map.get(key) ?? null,
    set: (key: string, value: string) => {
      if (!writable) throw new Error("Storage blocked");
      map.set(key, value);
    },
    delete: (key: string) => map.delete(key)
  });
  const ports = {
    consent: store(saved), session: store(session),
    uuid: () => "d9428888-122b-4d29-8a6b-64d9c2157110",
    now: () => now, device: () => "desktop" as const
  };
  const viewer = createGa4Consent("viewer", ports);
  const organizer = createGa4Consent("organizer:actor", ports);
  assert.equal(viewer.envelope(), null);
  viewer.choose(true);
  const first = viewer.envelope()!;
  now += 60_000;
  assert.equal(viewer.envelope()?.sessionId, first.sessionId);
  now += 30 * 60_000;
  assert.notEqual(viewer.envelope()?.sessionId, first.sessionId);
  assert.equal(organizer.envelope(), null);
  writable = false;
  viewer.choose(false);
  assert.equal(viewer.choice(), "denied");
  assert.equal(viewer.envelope(), null);
});
