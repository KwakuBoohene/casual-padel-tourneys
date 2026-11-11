import assert from "node:assert/strict";
import test from "node:test";
import { createGa4Consent } from "@padel/shared";
import { syncOrganizerConsent } from "../../src/utilities/analytics/organizerConsent";

test("one usage choice controls GA4, preserves identity while loading, and revokes its session", () => {
  const stored = new Map<string, string>();
  const sessions = new Map<string, string>();
  const storage = (values: Map<string, string>) => ({
    get: (key: string) => values.get(key) ?? null,
    set: (key: string, value: string) => { values.set(key, value); },
    delete: (key: string) => { values.delete(key); }
  });
  let ids = 0;
  const ports = {
    consent: storage(stored), session: storage(sessions),
    uuid: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, "0")}`,
    now: () => 1_800_000_000_000, device: () => "desktop" as const
  };
  const consent = createGa4Consent("organizer", ports);
  syncOrganizerConsent(consent, null);
  assert.equal(consent.envelope(), null);
  syncOrganizerConsent(consent, true);
  const first = consent.envelope()!;
  assert.equal(ids, 1);
  const reload = createGa4Consent("organizer", ports);
  syncOrganizerConsent(reload, null);
  syncOrganizerConsent(reload, true);
  assert.deepEqual(reload.envelope(), first);
  assert.equal(ids, 1);
  syncOrganizerConsent(reload, false);
  assert.equal(reload.envelope(), null);
  assert.equal(sessions.size, 0);
  syncOrganizerConsent(reload, true);
  assert.notEqual(reload.envelope()?.clientId, first.clientId);
  // Revocation wins even when browser storage becomes read-only.
  ports.consent.set = () => { throw new Error("blocked storage"); };
  syncOrganizerConsent(reload, false);
  assert.equal(reload.envelope(), null);
});
