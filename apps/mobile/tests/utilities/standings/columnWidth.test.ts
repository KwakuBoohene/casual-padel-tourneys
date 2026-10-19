import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_VISIBLE_COLUMNS,
  STANDINGS_COLUMNS,
  visibleStandingsColumns
} from "@padel/shared";

import { standingsStatsWidth } from "../../../src/utilities/standings/columnWidth";

const ALL = visibleStandingsColumns(STANDINGS_COLUMNS.map((column) => column.key));
const DEFAULTS = visibleStandingsColumns(DEFAULT_VISIBLE_COLUMNS);

test("the default five are narrower than all twelve", () => {
  assert.ok(
    standingsStatsWidth(DEFAULTS) < standingsStatsWidth(ALL),
    "otherwise hiding columns leaves the table scrolling over empty space"
  );
});

test("hiding a column always narrows the table", () => {
  const fewer = ALL.filter((column) => column.key !== "pwa");
  assert.ok(standingsStatsWidth(fewer) < standingsStatsWidth(ALL));
});

test("no visible columns is zero width, not NaN", () => {
  const width = standingsStatsWidth([]);
  assert.equal(width, 0);
  assert.ok(Number.isFinite(width));
});

test("width does not depend on the order columns are given", () => {
  assert.equal(standingsStatsWidth(DEFAULTS), standingsStatsWidth([...DEFAULTS].reverse()));
});

test("every column contributes a positive width", () => {
  for (const column of ALL) {
    assert.ok(standingsStatsWidth([column]) > 0, `${column.header} has no width`);
  }
});
