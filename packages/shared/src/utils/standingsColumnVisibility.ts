import { STANDINGS_COLUMNS, type StandingsColumnKey } from "./standings.js";
import type { StandingsSortState } from "./standingsSort.js";

/**
 * The columns shown before anyone chooses.
 *
 * Five, and every one is meaningful in **every** format. The rest are structurally zero depending on
 * how the event is scored — Americano records no games (`GW` `GL` `GD`), and Regular cannot draw and
 * has no rally points (`D` `PW(A)` `PL(A)`) — so a fixed default that included them would show a
 * quarter of the board as zeros to somebody. `GWR` is left out for the same reason: it is always
 * unavailable for Americano players, while `MWR` works everywhere.
 *
 * Typed as `StandingsColumnKey[]`, so renaming a column breaks the build here rather than silently
 * dropping it from the default.
 */
export const DEFAULT_VISIBLE_COLUMNS: StandingsColumnKey[] = ["mp", "w", "l", "pts", "mwr"];

/** One key for both surfaces, so a device cannot end up with two different saved preferences. */
export const STANDINGS_COLUMN_STORAGE_KEY = "padel.standings.columns";

/**
 * Marks a deliberately empty selection.
 *
 * An empty string already means "nothing saved", which resolves to the default — so hiding every
 * column needs its own representation, or the choice would silently revert on the next load. Not a
 * possible column key, so it can never collide with a real value.
 */
const NONE = "none";

const KNOWN_KEYS = new Set<string>(STANDINGS_COLUMNS.map((column) => column.key));

function isColumnKey(value: string): value is StandingsColumnKey {
  return KNOWN_KEYS.has(value);
}

/** Compact and stable. Order is not meaningful — rendering always follows `STANDINGS_COLUMNS`. */
export function serializeVisibleColumns(keys: StandingsColumnKey[]): string {
  return keys.length === 0 ? NONE : keys.join(",");
}

/**
 * Read a stored preference back, tolerating anything.
 *
 * This runs on every board render, so it must never throw: a value written by a newer build, a
 * half-finished write, or a column since removed all degrade to something sensible rather than
 * taking the leaderboard down.
 *
 * - nothing stored → the default five
 * - the empty-selection marker → no columns, which is a legitimate "just the names" view
 * - unknown keys → dropped; duplicates → collapsed
 * - **only** unknown keys → no columns, not the default. The viewer did choose; this build simply
 *   no longer has what they chose, and silently repopulating the board would undo their choice.
 */
export function parseVisibleColumns(raw: string | null | undefined): StandingsColumnKey[] {
  const trimmed = raw?.trim();
  if (!trimmed) return [...DEFAULT_VISIBLE_COLUMNS];
  if (trimmed === NONE) return [];

  const seen = new Set<StandingsColumnKey>();
  for (const part of trimmed.split(",")) {
    const key = part.trim();
    if (isColumnKey(key)) seen.add(key);
  }
  return [...seen];
}

/**
 * The column definitions to render, in `STANDINGS_COLUMNS` order however the keys arrive. Column
 * order is a property of the table, not of whatever order the viewer happened to tick things in.
 */
export function visibleStandingsColumns(
  keys: StandingsColumnKey[]
): (typeof STANDINGS_COLUMNS)[number][] {
  const wanted = new Set<StandingsColumnKey>(keys);
  return STANDINGS_COLUMNS.filter((column) => wanted.has(column.key));
}

/** Add or remove one column. Pure — the caller owns the state. */
export function toggleColumn(
  keys: StandingsColumnKey[],
  key: StandingsColumnKey
): StandingsColumnKey[] {
  return keys.includes(key) ? keys.filter((current) => current !== key) : [...keys, key];
}

/**
 * Drop the sort when its column is no longer on screen.
 *
 * A table ordered by a column the viewer cannot see has no visible explanation for its order, and
 * the sort indicator has nowhere to live. Falling back to rank order is the one state that always
 * makes sense.
 */
export function sortAfterHiding(
  sort: StandingsSortState | null,
  visible: StandingsColumnKey[]
): StandingsSortState | null {
  if (!sort) return null;
  return visible.includes(sort.key) ? sort : null;
}
