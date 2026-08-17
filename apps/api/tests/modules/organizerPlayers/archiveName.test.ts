import test from "node:test";
import assert from "node:assert/strict";

import { nextUnarchiveDisplayName } from "../../../src/modules/organizerPlayers/domain/archiveName.js";
import { canMergeCareers, sharedMatchIds } from "../../../src/modules/organizerPlayers/domain/mergeCareers.js";

test("unarchive prefers Name (unarchived) then numbered suffix", () => {
  const taken = new Set<string>();
  assert.equal(nextUnarchiveDisplayName("Paul", taken), "Paul (unarchived)");
  taken.add("paul (unarchived)");
  assert.equal(nextUnarchiveDisplayName("Paul", taken), "Paul unarchived-1");
  taken.add("paul unarchived-1");
  assert.equal(nextUnarchiveDisplayName("Paul", taken), "Paul unarchived-2");
});

test("merge rejects when both careers share a match", () => {
  assert.equal(canMergeCareers(["m1", "m2"], ["m3"]), true);
  assert.equal(canMergeCareers(["m1", "m2"], ["m2"]), false);
  assert.deepEqual(sharedMatchIds(["m1", "m2"], ["m2", "m4"]), ["m2"]);
});
