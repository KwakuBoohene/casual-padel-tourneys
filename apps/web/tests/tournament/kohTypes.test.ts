import assert from "node:assert/strict";
import test from "node:test";

import { formatKohLastResult, formatKohPair, isKohPublicHub } from "../../app/tournament/[id]/kohTypes";

test("isKohPublicHub detects KOH mode", () => {
  assert.equal(
    isKohPublicHub({
      id: "t1",
      publicToken: "p1",
      updatedAt: new Date().toISOString(),
      config: { name: "KOH", mode: "KING_OF_THE_COURT" },
      courts: []
    }),
    true
  );
  assert.equal(
    isKohPublicHub({
      id: "t1",
      config: { name: "AM", mode: "AMERICANO" },
      courts: []
    }),
    false
  );
});

test("formatKohLastResult", () => {
  assert.equal(
    formatKohLastResult({ gamesA: 2, gamesB: 1, hadSpecialFinish: true, specialLabel: "Golden" }),
    "Last: 2-1 · Golden"
  );
  assert.equal(formatKohPair({ id: "u", playerAId: "a", playerBId: "b", playerAName: "Alex", playerBName: "Sam" }), "Alex / Sam");
});
