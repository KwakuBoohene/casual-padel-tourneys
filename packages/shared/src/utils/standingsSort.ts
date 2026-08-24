import {
  gameWinRate,
  matchWinRate,
  type StandingsColumnKey,
  type StandingsLine
} from "./standings.js";

export type StandingsSortDirection = "asc" | "desc";

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
