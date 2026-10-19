import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_VISIBLE_COLUMNS,
  STANDINGS_COLUMNS,
  parseVisibleColumns,
  serializeVisibleColumns,
  type StandingsColumnKey
} from "@padel/shared";

import { standingsTableMinWidth } from "../../app/tournament/[id]/leaderboard/columnWidth";
import { decodeColumnsCookie } from "../../lib/standingsColumnsCookie";

const ALL_KEYS = STANDINGS_COLUMNS.map((column) => column.key);

test("the default five need a narrower table than all twelve", () => {
  assert.ok(
    standingsTableMinWidth(DEFAULT_VISIBLE_COLUMNS) < standingsTableMinWidth(ALL_KEYS),
    "a fixed floor would keep a five-column table scrolling across the width of twelve"
  );
});

test("hiding a column always narrows the minimum", () => {
  const fewer = ALL_KEYS.filter((key) => key !== "pwa");
  assert.ok(standingsTableMinWidth(fewer) < standingsTableMinWidth(ALL_KEYS));
});

test("with no stat columns there is still room for rank and name", () => {
  assert.ok(standingsTableMinWidth([]) > 0);
  assert.ok(Number.isFinite(standingsTableMinWidth([])));
});

test("width does not depend on the order of the keys", () => {
  assert.equal(
    standingsTableMinWidth(DEFAULT_VISIBLE_COLUMNS),
    standingsTableMinWidth([...DEFAULT_VISIBLE_COLUMNS].reverse())
  );
});

// --- what the server reads out of the cookie ----------------------------------------------------

/** The real decoder the server uses; `readVisibleColumnsCookie` only adds `next/headers`. */
const fromCookie = decodeColumnsCookie;

test("no cookie yields the default five, the same as a first-time mobile user", () => {
  assert.deepEqual(fromCookie(undefined), DEFAULT_VISIBLE_COLUMNS);
});

test("a cookie round trips through URL encoding", () => {
  const keys: StandingsColumnKey[] = ["mp", "gw", "gwr"];
  const encoded = encodeURIComponent(serializeVisibleColumns(keys));
  assert.deepEqual(new Set(fromCookie(encoded)), new Set(keys));
});

test("an empty selection survives the cookie, so 'hide everything' is not undone on reload", () => {
  const encoded = encodeURIComponent(serializeVisibleColumns([]));
  assert.deepEqual(fromCookie(encoded), []);
});

test("a hand-edited cookie cannot crash the page", () => {
  assert.deepEqual(fromCookie("%%%not-valid%%%"), []);
  assert.deepEqual(fromCookie("mp,garbage,w"), ["mp", "w"]);
});

test("the server and the browser agree on what a stored value means", () => {
  const keys: StandingsColumnKey[] = ["mp", "w", "pts"];
  const written = serializeVisibleColumns(keys);
  assert.deepEqual(
    fromCookie(encodeURIComponent(written)),
    parseVisibleColumns(written),
    "cookie and localStorage must not disagree about the same string"
  );
});
