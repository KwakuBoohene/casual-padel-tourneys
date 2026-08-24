import assert from "node:assert/strict";
import test from "node:test";
import { standingsLineFromRecord, type StandingsLine } from "@padel/shared";

import {
  nextSortState,
  sortStandingsRows,
  type StandingsSortState
} from "../../../src/hooks/standings/useStandingsSort";

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
const strong = row("strong", 1, { wins: 6, losses: 2, gamesWon: 30, gamesLost: 20 });
const weak = row("weak", 2, { wins: 2, losses: 6, gamesWon: 20, gamesLost: 30 });
/** Two matches, three games — below both arms, so its rates are unavailable. */
const unrated = row("unrated", 3, { wins: 1, losses: 1, gamesWon: 2, gamesLost: 1 });

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
  const rows = [weak, strong];
  assert.equal(sortStandingsRows(rows, null), rows);
});

test("sorting never mutates the input", () => {
  const rows = [weak, strong];
  const before = ids(rows);
  sortStandingsRows(rows, { key: "mwr", direction: "desc" });
  assert.deepEqual(ids(rows), before);
});

test("descending puts the best win rate first, ascending the worst", () => {
  assert.deepEqual(ids(sortStandingsRows([weak, strong], { key: "mwr", direction: "desc" })), [
    "strong",
    "weak"
  ]);
  assert.deepEqual(ids(sortStandingsRows([strong, weak], { key: "mwr", direction: "asc" })), [
    "weak",
    "strong"
  ]);
});

test("unavailable rates sort last in BOTH directions", () => {
  assert.deepEqual(
    ids(sortStandingsRows([unrated, weak, strong], { key: "mwr", direction: "desc" })),
    ["strong", "weak", "unrated"]
  );
  assert.deepEqual(
    ids(sortStandingsRows([unrated, weak, strong], { key: "mwr", direction: "asc" })),
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
  assert.deepEqual(ids(sortStandingsRows([strong], { key: "gwr", direction: "asc" })), ["strong"]);
  assert.deepEqual(ids(sortStandingsRows([strong], { key: "gwr", direction: "desc" })), ["strong"]);
});

test("plain counter columns sort too, not just the rates", () => {
  assert.deepEqual(ids(sortStandingsRows([weak, strong], { key: "pts", direction: "desc" })), [
    "strong",
    "weak"
  ]);
});

test("rank is carried on the row, so sorting cannot renumber the # column", () => {
  // Ascending deliberately: the view order (weak, strong, unrated) differs from rank order, so a
  // rank re-derived from position would read 1,2,3 and this would catch it.
  const sorted = sortStandingsRows([strong, weak, unrated], { key: "mwr", direction: "asc" });
  assert.deepEqual(ids(sorted), ["weak", "strong", "unrated"]);
  assert.deepEqual(
    sorted.map((r) => r.rank),
    [2, 1, 3],
    "ranks travel with their rows rather than following screen position"
  );
});
