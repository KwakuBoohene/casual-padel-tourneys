import test from "node:test";
import assert from "node:assert/strict";

import {
  formatGameDiff,
  STANDINGS_HELP_ABBREVIATIONS,
  STANDINGS_RANKING_STEPS,
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
    gd: "+16",
    pts: "8"
  });
});

test("standings help lists table columns then Americano rally abbreviations", () => {
  assert.equal(STANDINGS_HELP_ABBREVIATIONS[0]?.abbrev, "MP");
  assert.equal(STANDINGS_HELP_ABBREVIATIONS.at(-1)?.abbrev, "PL(A)");
  assert.ok(STANDINGS_RANKING_STEPS[0]?.startsWith("PTS"));
});
