import assert from "node:assert/strict";
import test from "node:test";

import { organizerGa4Event } from "../../src/schemas/ga4.ts";

const envelope = {
  consent: true,
  clientId: "d9428888-122b-4d29-8a6b-64d9c2157110",
  sessionId: 1_720_000_000,
  device: "mobile"
};

test("draft_action accepts known actions only and carries no identifiers", () => {
  assert.equal(organizerGa4Event.safeParse({ ...envelope, event: "draft_action", action: "started" }).success, true);
  assert.equal(organizerGa4Event.safeParse({ ...envelope, event: "draft_action", action: "renamed" }).success, false);
  assert.equal(
    organizerGa4Event.safeParse({ ...envelope, event: "draft_action", action: "saved", draftId: "d1" }).success,
    false
  );
});
