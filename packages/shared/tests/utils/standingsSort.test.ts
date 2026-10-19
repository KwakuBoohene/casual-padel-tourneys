import test from "node:test";
import assert from "node:assert/strict";

import { standingsLineFromRecord, type StandingsLine } from "../../src/utils/standings.js";
import {
  compareByStandingsColumn,
  nextSortState,
  sortStandingsRows,
  standingsColumnValue,
  type StandingsSortState
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

// --- the press cycle and applying a sort ------------------------------------------------------
interface Row {
  id: string;
  rank: number;
  line: StandingsLine;
}

const row = (id: string, rank: number, line: Partial<Parameters<typeof standingsLineFromRecord>[0]> = {}): Row => ({
  id,
  rank,
  line: standingsLineFromRecord({ wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, ...line })
});

/** Eligible: 8 matches, 50 games. */
const strongRow = row("strong", 1, { wins: 6, losses: 2, gamesWon: 30, gamesLost: 20 });
const weakRow = row("weak", 2, { wins: 2, losses: 6, gamesWon: 20, gamesLost: 30 });
/** Two matches, three games — below both arms, so its rates are unavailable. */
const unratedRow = row("unrated", 3, { wins: 1, losses: 1, gamesWon: 2, gamesLost: 1 });

const ids = (rows: Row[]) => rows.map((r) => r.id);

// --- the press cycle ---------------------------------------------------------------------------

test("a first press sorts ascending", () => {
  assert.deepEqual(nextSortState(null, "mwr"), { key: "mwr", direction: "asc" });
});

test("a second press on the same column reverses to descending", () => {
  assert.deepEqual(nextSortState({ key: "mwr", direction: "asc" }, "mwr"), {
    key: "mwr",
    direction: "desc"
  });
});

test("a third press returns to the default rank order", () => {
  assert.equal(nextSortState({ key: "mwr", direction: "desc" }, "mwr"), null);
});

test("three presses always land back where they started", () => {
  let state: StandingsSortState | null = null;
  for (let i = 0; i < 3; i += 1) state = nextSortState(state, "gwr");
  assert.equal(state, null);
});

test("pressing a different column starts that column's cycle ascending", () => {
  assert.deepEqual(nextSortState({ key: "mwr", direction: "desc" }, "pts"), {
    key: "pts",
    direction: "asc"
  });
});

// --- applying the sort -------------------------------------------------------------------------

test("no sort returns the caller's own order, untouched", () => {
  const rows = [weakRow, strongRow];
  assert.equal(sortStandingsRows(rows, null), rows);
});

test("sorting never mutates the input", () => {
  const rows = [weakRow, strongRow];
  const before = ids(rows);
  sortStandingsRows(rows, { key: "mwr", direction: "desc" });
  assert.deepEqual(ids(rows), before);
});

test("descending puts the best win rate first, ascending the worst", () => {
  assert.deepEqual(ids(sortStandingsRows([weakRow, strongRow], { key: "mwr", direction: "desc" })), [
    "strong",
    "weak"
  ]);
  assert.deepEqual(ids(sortStandingsRows([strongRow, weakRow], { key: "mwr", direction: "asc" })), [
    "weak",
    "strong"
  ]);
});

test("unavailable rates sort last in BOTH directions", () => {
  assert.deepEqual(
    ids(sortStandingsRows([unratedRow, weakRow, strongRow], { key: "mwr", direction: "desc" })),
    ["strong", "weak", "unrated"]
  );
  assert.deepEqual(
    ids(sortStandingsRows([unratedRow, weakRow, strongRow], { key: "mwr", direction: "asc" })),
    ["weak", "strong", "unrated"]
  );
});

test("a column of nothing but unavailable rates keeps rank order rather than reshuffling", () => {
  const a = row("a", 1, { wins: 1, losses: 0, gamesWon: 2, gamesLost: 0 });
  const b = row("b", 2, { wins: 0, losses: 1, gamesWon: 0, gamesLost: 2 });
  const c = row("c", 3, { wins: 1, losses: 1, gamesWon: 1, gamesLost: 1 });
  for (const direction of ["asc", "desc"] as const) {
    assert.deepEqual(ids(sortStandingsRows([a, b, c], { key: "gwr", direction })), ["a", "b", "c"]);
  }
});

test("ties fall back to the order they came in, so the table is deterministic", () => {
  const first = row("first", 1, { wins: 4, losses: 4, gamesWon: 20, gamesLost: 20 });
  const second = row("second", 2, { wins: 4, losses: 4, gamesWon: 25, gamesLost: 25 });
  assert.deepEqual(ids(sortStandingsRows([first, second], { key: "mwr", direction: "desc" })), [
    "first",
    "second"
  ]);
});

test("a single row is a no-op in either direction", () => {
  assert.deepEqual(ids(sortStandingsRows([strongRow], { key: "gwr", direction: "asc" })), ["strong"]);
  assert.deepEqual(ids(sortStandingsRows([strongRow], { key: "gwr", direction: "desc" })), ["strong"]);
});

test("plain counter columns sort too, not just the rates", () => {
  assert.deepEqual(ids(sortStandingsRows([weakRow, strongRow], { key: "pts", direction: "desc" })), [
    "strong",
    "weak"
  ]);
});

test("rank is carried on the row, so sorting cannot renumber the # column", () => {
  // Ascending deliberately: the view order (weakRow, strongRow, unratedRow) differs from rank order, so a
  // rank re-derived from position would read 1,2,3 and this would catch it.
  const sorted = sortStandingsRows([strongRow, weakRow, unratedRow], { key: "mwr", direction: "asc" });
  assert.deepEqual(ids(sorted), ["weak", "strong", "unrated"]);
  assert.deepEqual(
    sorted.map((r) => r.rank),
    [2, 1, 3],
    "ranks travel with their rows rather than following screen position"
  );
});
