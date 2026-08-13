import test from "node:test";
import assert from "node:assert/strict";

import { assertOrganizer } from "./organizerAccess.js";

test("assertOrganizer allows matching organizerId", () => {
  assert.doesNotThrow(() => assertOrganizer("user-1", { organizerId: "user-1" }));
});

test("assertOrganizer rejects missing tournament, null organizer, or mismatch", () => {
  assert.throws(() => assertOrganizer("user-1", undefined), /Tournament not found/);
  assert.throws(() => assertOrganizer("user-1", { organizerId: null }), /Tournament not found/);
  assert.throws(() => assertOrganizer("user-1", { organizerId: "other" }), /Tournament not found/);
});
