import assert from "node:assert/strict";
import test from "node:test";

import {
  formatKohRankingStats,
  formatKohUnitLabel
} from "../../../src/utilities/koh/rankingFormat";

test("formatKohRankingStats", () => {
  assert.equal(
    formatKohRankingStats({
      rank: 1,
      unitId: "u1",
      courtNumber: 1,
      playerAName: "A",
      playerBName: "B",
      matchesWon: 4,
      matchesLost: 1,
      gameDiff: 9,
      specialLosses: 1
    }),
    "4-1 +9 G-lost 1"
  );
  assert.equal(formatKohUnitLabel("Paul", "Peter"), "Paul / Peter");
});
