import test from "node:test";
import assert from "node:assert/strict";

import {
  formatGameDiff,
  standingsCells,
  standingsLineFromRecord
} from "../../src/utils/standings.js";

test("formatGameDiff prefixes positives", () => {
  assert.equal(formatGameDiff(12), "+12");
  assert.equal(formatGameDiff(0), "0");
  assert.equal(formatGameDiff(-4), "-4");
});

test("standingsLineFromRecord uses W+L+D as matches played", () => {
  const line = standingsLineFromRecord({
    wins: 8,
    losses: 3,
    draws: 1,
    gamesWon: 48,
    gamesLost: 32
  });
  assert.equal(line.matchesPlayed, 12);
  assert.deepEqual(standingsCells(line), {
    mp: "12",
    w: "8",
    l: "3",
    d: "1",
    gw: "48",
    gl: "32",
    gd: "+16"
  });
});
