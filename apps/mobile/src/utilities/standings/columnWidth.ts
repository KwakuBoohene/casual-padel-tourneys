import { STANDINGS_COLUMNS, type StandingsColumnKey } from "@padel/shared";

export type StandingsColumn = (typeof STANDINGS_COLUMNS)[number];

const COL_W = 28;
const GD_W = 34;
const AM_W = 42;
/** Wide enough for "100.0%" without truncating; the em dash sits comfortably inside it. */
const RATE_W = 46;

/** Rank column, the player name's minimum, the row gap and horizontal padding. */
export const NAME_AND_PADDING_W = 136;

export function standingsColumnWidth(key: StandingsColumnKey): number {
  if (key === "mwr" || key === "gwr") return RATE_W;
  if (key === "pwa" || key === "pla") return AM_W;
  if (key === "gd" || key === "pts") return GD_W;
  return COL_W;
}

/**
 * Total width of the columns actually on screen.
 *
 * Derived rather than a constant: summing all twelve would leave a five-column table scrolling
 * over empty space, and a column added to `STANDINGS_COLUMNS` widens the table instead of
 * squeezing the player name.
 *
 * Lives in a plain module so it can be unit tested — anything importing `react-native` cannot be.
 */
export function standingsStatsWidth(columns: StandingsColumn[]): number {
  return columns.reduce((sum, column) => sum + standingsColumnWidth(column.key), 0);
}
