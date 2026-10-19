import assert from "node:assert/strict";
import test from "node:test";

import {
  LEADERBOARD_EXPORT_HEADERS
} from "../../src/export/exportTable.js";
import { STANDINGS_COLUMNS, type StandingsColumnKey } from "../../src/utils/standings.js";
import {
  DEFAULT_VISIBLE_COLUMNS,
  parseVisibleColumns,
  serializeVisibleColumns,
  sortAfterHiding,
  STANDINGS_COLUMN_STORAGE_KEY,
  toggleColumn,
  visibleStandingsColumns
} from "../../src/utils/standingsColumnVisibility.js";

const ALL_KEYS = STANDINGS_COLUMNS.map((column) => column.key);

// --- the default -------------------------------------------------------------------------------

test("the default is the agreed five columns", () => {
  assert.deepEqual(DEFAULT_VISIBLE_COLUMNS, ["mp", "w", "l", "pts", "mwr"]);
});

test("every default column actually exists in the table", () => {
  for (const key of DEFAULT_VISIBLE_COLUMNS) {
    assert.ok(ALL_KEYS.includes(key), `${key} is not a standings column`);
  }
});

test("the default deliberately hides the format-specific columns", () => {
  for (const key of ["gw", "gl", "gd", "d", "pwa", "pla", "gwr"] as StandingsColumnKey[]) {
    assert.ok(!DEFAULT_VISIBLE_COLUMNS.includes(key), `${key} should be off by default`);
  }
});

test("both surfaces share one storage key", () => {
  assert.equal(typeof STANDINGS_COLUMN_STORAGE_KEY, "string");
  assert.ok(STANDINGS_COLUMN_STORAGE_KEY.length > 0);
});

// --- parsing a stored value --------------------------------------------------------------------

test("nothing stored falls back to the default", () => {
  assert.deepEqual(parseVisibleColumns(null), DEFAULT_VISIBLE_COLUMNS);
  assert.deepEqual(parseVisibleColumns(undefined), DEFAULT_VISIBLE_COLUMNS);
  assert.deepEqual(parseVisibleColumns(""), DEFAULT_VISIBLE_COLUMNS);
  assert.deepEqual(parseVisibleColumns("   "), DEFAULT_VISIBLE_COLUMNS);
});

test("the fallback is a copy, so a caller cannot mutate the default for everyone", () => {
  const first = parseVisibleColumns(null);
  first.push("gw");
  assert.deepEqual(parseVisibleColumns(null), ["mp", "w", "l", "pts", "mwr"]);
});

test("a stored list is read back", () => {
  assert.deepEqual(parseVisibleColumns("mp,w,gwr"), ["mp", "w", "gwr"]);
});

test("unknown keys are dropped rather than throwing", () => {
  assert.deepEqual(parseVisibleColumns("mp,notacolumn,w"), ["mp", "w"]);
});

test("a value naming only unknown columns is an empty selection, not the default", () => {
  assert.deepEqual(
    parseVisibleColumns("removed,alsoremoved"),
    [],
    "the viewer chose; this build just no longer has what they chose"
  );
});

test("duplicates collapse", () => {
  assert.deepEqual(parseVisibleColumns("mp,mp,w,mp"), ["mp", "w"]);
});

test("surrounding whitespace on each key is tolerated", () => {
  assert.deepEqual(parseVisibleColumns(" mp , w ,pts "), ["mp", "w", "pts"]);
});

// --- round trip --------------------------------------------------------------------------------

test("a selection survives a round trip", () => {
  const keys: StandingsColumnKey[] = ["mp", "gwr", "pla"];
  assert.deepEqual(new Set(parseVisibleColumns(serializeVisibleColumns(keys))), new Set(keys));
});

test("hiding every column survives a reload — the case an empty string cannot express", () => {
  const stored = serializeVisibleColumns([]);
  assert.notEqual(stored, "", "an empty string would be indistinguishable from nothing saved");
  assert.deepEqual(parseVisibleColumns(stored), []);
});

test("showing every column survives a round trip", () => {
  const stored = serializeVisibleColumns([...ALL_KEYS]);
  assert.deepEqual(new Set(parseVisibleColumns(stored)), new Set(ALL_KEYS));
});

// --- rendering order ---------------------------------------------------------------------------

test("visible columns come back in table order, not the order they were ticked", () => {
  const reversed = [...DEFAULT_VISIBLE_COLUMNS].reverse();
  assert.deepEqual(
    visibleStandingsColumns(reversed).map((column) => column.key),
    ["mp", "w", "l", "pts", "mwr"]
  );
});

test("visible columns carry their header and title for rendering", () => {
  const [first] = visibleStandingsColumns(["mwr"]);
  assert.equal(first?.header, "MWR");
  assert.ok(first?.title.includes("Match win rate"));
});

test("an empty selection renders no stat columns", () => {
  assert.deepEqual(visibleStandingsColumns([]), []);
});

test("unknown keys cannot conjure a column", () => {
  assert.deepEqual(visibleStandingsColumns(["nope" as StandingsColumnKey]), []);
});

// --- toggling ----------------------------------------------------------------------------------

test("toggle adds a hidden column and removes a visible one", () => {
  assert.deepEqual(toggleColumn(["mp", "w"], "gw"), ["mp", "w", "gw"]);
  assert.deepEqual(toggleColumn(["mp", "w", "gw"], "w"), ["mp", "gw"]);
});

test("toggle does not mutate its input", () => {
  const keys: StandingsColumnKey[] = ["mp", "w"];
  toggleColumn(keys, "gw");
  toggleColumn(keys, "mp");
  assert.deepEqual(keys, ["mp", "w"]);
});

test("toggling the last visible column is allowed", () => {
  assert.deepEqual(toggleColumn(["mp"], "mp"), []);
});

// --- sorting interaction -----------------------------------------------------------------------

test("hiding the sorted column drops the sort", () => {
  assert.equal(sortAfterHiding({ key: "gwr", direction: "desc" }, ["mp", "w"]), null);
});

test("a sort on a still-visible column is left alone", () => {
  const sort = { key: "mwr", direction: "asc" } as const;
  assert.deepEqual(sortAfterHiding(sort, ["mp", "mwr"]), sort);
});

test("no sort stays no sort", () => {
  assert.equal(sortAfterHiding(null, ["mp"]), null);
});

test("hiding everything drops any sort", () => {
  assert.equal(sortAfterHiding({ key: "mp", direction: "asc" }, []), null);
});

// --- exports are not a view (epic 33, DECISION 4) ------------------------------------------------

test("export headers still carry every column, whatever a device hides", () => {
  for (const column of STANDINGS_COLUMNS) {
    assert.ok(
      LEADERBOARD_EXPORT_HEADERS.includes(column.header),
      `${column.header} must stay in exports — an export is a record, not a view`
    );
  }
  assert.equal(LEADERBOARD_EXPORT_HEADERS.length, STANDINGS_COLUMNS.length + 2, "plus # and Player");
});
