import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAYERS_PER_PAGE,
  playerPageCount,
  playerPageRange
} from "../../../src/hooks/organizer/usePlayerPages";

test("PLAYERS_PER_PAGE is 8", () => {
  assert.equal(PLAYERS_PER_PAGE, 8);
});

test("playerPageCount for empty, full, and overflow pages", () => {
  assert.equal(playerPageCount(0), 1);
  assert.equal(playerPageCount(8), 1);
  assert.equal(playerPageCount(9), 2);
  assert.equal(playerPageCount(16), 2);
});

test("playerPageRange slices 8 names on page 0 and the remainder on page 1", () => {
  assert.deepEqual(playerPageRange(8, 0), { start: 0, end: 8 });
  assert.deepEqual(playerPageRange(9, 0), { start: 0, end: 8 });
  assert.deepEqual(playerPageRange(9, 1), { start: 8, end: 9 });
  assert.deepEqual(playerPageRange(16, 1), { start: 8, end: 16 });
  assert.deepEqual(playerPageRange(0, 0), { start: 0, end: 0 });
});
