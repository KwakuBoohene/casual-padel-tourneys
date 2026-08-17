import test from "node:test";
import assert from "node:assert/strict";

import {
  standingsPageCount,
  standingsPageRange,
  standingsPageSize
} from "../../src/utils/standingsPaging.js";

test("standingsPageSize fits fewer rows on a compact phone", () => {
  const phone = standingsPageSize(390, 844);
  const desktop = standingsPageSize(1280, 900);
  assert.ok(phone <= 8);
  assert.ok(desktop >= phone);
});

test("standingsPageRange slices by page size", () => {
  assert.equal(standingsPageCount(20, 8), 3);
  assert.deepEqual(standingsPageRange(20, 0, 8), { start: 0, end: 8 });
  assert.deepEqual(standingsPageRange(20, 2, 8), { start: 16, end: 20 });
});
