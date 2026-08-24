import test from "node:test";
import assert from "node:assert/strict";

import { standingsLineFromRecord, type StandingsLine } from "../../src/utils/standings.js";
import {
  compareByStandingsColumn,
  standingsColumnValue
} from "../../src/utils/standingsSort.js";

/** Eligible, 75% match win rate, 60% game win rate. */
const strong = standingsLineFromRecord({ wins: 6, losses: 2, gamesWon: 30, gamesLost: 20 });
/** Eligible, 25% match win rate, 40% game win rate. */
const weak = standingsLineFromRecord({ wins: 2, losses: 6, gamesWon: 20, gamesLost: 30 });
/** Two matches, three games — below both arms, so both rates are unavailable. */
const unrated = standingsLineFromRecord({ wins: 1, losses: 1, gamesWon: 2, gamesLost: 1 });

const order = (lines: StandingsLine[], key: "mwr" | "gwr" | "pts", direction: "asc" | "desc") =>
  [...lines].sort(compareByStandingsColumn(key, direction));

test("standingsColumnValue reads every column off the line", () => {
  const line = standingsLineFromRecord({
    wins: 3,
    losses: 1,
    draws: 1,
    gamesWon: 12,
    gamesLost: 7,
    americanoPointsWon: 24,
    americanoPointsLost: 18
  });
  assert.equal(standingsColumnValue("mp", line), 5);
  assert.equal(standingsColumnValue("w", line), 3);
  assert.equal(standingsColumnValue("l", line), 1);
  assert.equal(standingsColumnValue("d", line), 1);
  assert.equal(standingsColumnValue("gw", line), 12);
  assert.equal(standingsColumnValue("gl", line), 7);
  assert.equal(standingsColumnValue("gd", line), 5);
  assert.equal(standingsColumnValue("pwa", line), 24);
  assert.equal(standingsColumnValue("pla", line), 18);
  assert.equal(standingsColumnValue("pts", line), 3);
  assert.equal(standingsColumnValue("mwr", line), 0.6);
});

test("an unavailable rate reads as null, not as zero", () => {
  assert.equal(standingsColumnValue("mwr", unrated), null);
  assert.equal(standingsColumnValue("gwr", unrated), null);
  assert.equal(standingsColumnValue("pts", unrated), 1);
});

test("descending sorts the best rate first", () => {
  assert.deepEqual(order([weak, strong], "mwr", "desc"), [strong, weak]);
  assert.deepEqual(order([weak, strong], "gwr", "desc"), [strong, weak]);
});

test("ascending sorts the worst rate first", () => {
  assert.deepEqual(order([strong, weak], "mwr", "asc"), [weak, strong]);
  assert.deepEqual(order([strong, weak], "gwr", "asc"), [weak, strong]);
});

test("unrated rows sort last DESCENDING", () => {
  assert.deepEqual(order([unrated, strong, weak], "mwr", "desc"), [strong, weak, unrated]);
  assert.deepEqual(order([unrated, strong, weak], "gwr", "desc"), [strong, weak, unrated]);
});

test("unrated rows sort last ASCENDING too — flipping the arrow must not promote them", () => {
  assert.deepEqual(order([unrated, strong, weak], "mwr", "asc"), [weak, strong, unrated]);
  assert.deepEqual(order([unrated, strong, weak], "gwr", "asc"), [weak, strong, unrated]);
});

test("an unrated row is not treated as the worst performer", () => {
  const [first] = order([unrated, weak], "mwr", "asc");
  assert.equal(first, weak, "a 25% player is genuinely worse than a player with no rate at all");
});

test("two unrated rows keep their original order", () => {
  const other = standingsLineFromRecord({ wins: 0, losses: 1, gamesWon: 1, gamesLost: 1 });
  assert.deepEqual(order([unrated, other], "mwr", "desc"), [unrated, other]);
  assert.deepEqual(order([other, unrated], "mwr", "desc"), [other, unrated]);
});

test("equal values keep their original order, leaving the default rank as the tie-break", () => {
  const a = standingsLineFromRecord({ wins: 4, losses: 4, gamesWon: 20, gamesLost: 20 });
  const b = standingsLineFromRecord({ wins: 4, losses: 4, gamesWon: 25, gamesLost: 25 });
  assert.equal(compareByStandingsColumn("mwr", "desc")(a, b), 0);
  assert.deepEqual(order([a, b], "mwr", "desc"), [a, b]);
  assert.deepEqual(order([b, a], "mwr", "desc"), [b, a]);
});

test("plain numeric columns still sort both ways", () => {
  assert.deepEqual(order([weak, strong], "pts", "desc"), [strong, weak]);
  assert.deepEqual(order([strong, weak], "pts", "asc"), [weak, strong]);
});
