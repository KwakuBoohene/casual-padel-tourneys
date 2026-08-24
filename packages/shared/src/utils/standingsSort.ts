import {
  gameWinRate,
  matchWinRate,
  type StandingsColumnKey,
  type StandingsLine
} from "./standings.js";

export type StandingsSortDirection = "asc" | "desc";

export interface StandingsSortState {
  key: StandingsColumnKey;
  direction: StandingsSortDirection;
}

interface SortableRow {
  line: StandingsLine;
}

/**
 * The press cycle for one column: ascending, then descending, then back to `null` — the board's own
 * rank order. Three presses always return a viewer to where they started, so a sort can be undone
 * without hunting for a reset control. Activating a different column starts its own cycle.
 *
 * Lives here rather than on either surface so mobile and web cannot drift into different
 * interactions for the same table.
 */
export function nextSortState(
  current: StandingsSortState | null,
  key: StandingsColumnKey
): StandingsSortState | null {
  if (!current || current.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
}

/**
 * Apply a sort, leaving the input untouched. `null` means the caller's existing order.
 *
 * Array#sort is stable, so rows with equal values — including a whole column of unavailable win
 * rates early in an event — keep their rank order instead of reshuffling.
 */
export function sortStandingsRows<T extends SortableRow>(
  rows: T[],
  sort: StandingsSortState | null
): T[] {
  if (!sort) return rows;
  const compare = compareByStandingsColumn(sort.key, sort.direction);
  return [...rows].sort((a, b) => compare(a.line, b.line));
}

/**
 * The number behind a column, or `null` where there is genuinely no value — an unavailable win
 * rate. `null` is not zero: a player with too few matches has not "won 0%", so it must never sort
 * among the worst performers.
 *
 * The switch is exhaustive over `StandingsColumnKey`, so adding a column to `STANDINGS_COLUMNS`
 * without deciding how it sorts is a compile error rather than a silently unsortable header.
 */
export function standingsColumnValue(
  key: StandingsColumnKey,
  line: StandingsLine
): number | null {
  switch (key) {
    case "mp":
      return line.matchesPlayed;
    case "w":
      return line.wins;
    case "l":
      return line.losses;
    case "d":
      return line.draws;
    case "gw":
      return line.gamesWon;
    case "gl":
      return line.gamesLost;
    case "gd":
      return line.gamesWon - line.gamesLost;
    case "pwa":
      return line.americanoPointsWon;
    case "pla":
      return line.americanoPointsLost;
    case "pts":
      return line.points;
    case "mwr":
      return matchWinRate(line);
    case "gwr":
      return gameWinRate(line);
  }
}

/**
 * Comparator for one column. Rows with no value sort **last in both directions**, so flipping the
 * arrow never parades unrated players to the top.
 *
 * Returns 0 for equal values, leaving the caller's existing order intact — sort with a stable sort
 * (`Array.prototype.sort` is stable) to keep the default rank as the tie-break.
 */
export function compareByStandingsColumn(
  key: StandingsColumnKey,
  direction: StandingsSortDirection
): (a: StandingsLine, b: StandingsLine) => number {
  return (a, b) => {
    const left = standingsColumnValue(key, a);
    const right = standingsColumnValue(key, b);
    if (left === null || right === null) {
      if (left === right) return 0;
      return left === null ? 1 : -1;
    }
    if (left === right) return 0;
    return direction === "asc" ? left - right : right - left;
  };
}
