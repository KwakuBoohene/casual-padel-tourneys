import test from "node:test";
import assert from "node:assert/strict";

import {
  areAllMatchesResolved,
  countUnfinishedMatches,
  isMatchCountable,
  isMatchUnfinished,
  isMatchVoided
} from "../../src/scoring/matchVoid.js";

const played = { completed: true, voidedAt: undefined };
const open = { completed: false, voidedAt: undefined };
const voided = { completed: false, voidedAt: "2026-08-19T10:00:00.000Z" };

test("isMatchVoided treats undefined and null as not voided", () => {
  assert.equal(isMatchVoided({ voidedAt: undefined }), false);
  assert.equal(isMatchVoided({ voidedAt: null }), false);
  assert.equal(isMatchVoided(voided), true);
});

test("isMatchUnfinished is true only for an open, unvoided match", () => {
  assert.equal(isMatchUnfinished(open), true);
  assert.equal(isMatchUnfinished(played), false);
  assert.equal(isMatchUnfinished(voided), false);
});

test("isMatchCountable requires completed and not voided", () => {
  assert.equal(isMatchCountable(played), true);
  assert.equal(isMatchCountable(open), false);
  assert.equal(isMatchCountable(voided), false);
  // A voided match that had been completed must still not count.
  assert.equal(isMatchCountable({ completed: true, voidedAt: "2026-08-19T10:00:00.000Z" }), false);
});

test("countUnfinishedMatches counts across rounds and ignores voided", () => {
  const rounds = [
    { matches: [played, played] },
    { matches: [played, open, open] },
    { matches: [voided, open] }
  ];
  assert.equal(countUnfinishedMatches(rounds), 3);
});

test("countUnfinishedMatches is 0 for an empty schedule", () => {
  assert.equal(countUnfinishedMatches([]), 0);
  assert.equal(countUnfinishedMatches([{ matches: [] }]), 0);
});

test("areAllMatchesResolved accepts a mix of played and voided", () => {
  assert.equal(areAllMatchesResolved([{ matches: [played, voided] }]), true);
  assert.equal(areAllMatchesResolved([{ matches: [played, open] }]), false);
});
