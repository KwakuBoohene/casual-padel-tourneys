import { type StandingsColumnKey } from "@padel/shared";

/** Rank column, the player name's minimum, and cell padding. */
const NAME_AND_PADDING_W = 150;

/**
 * A floor per column so the table does not squash headers when it is narrower than the viewport.
 * The wider columns are the ones with wider headers — `PW(A)` and the win rates.
 */
function columnMinWidth(key: StandingsColumnKey): number {
  if (key === "mwr" || key === "gwr") return 52;
  if (key === "pwa" || key === "pla") return 48;
  if (key === "gd" || key === "pts") return 38;
  return 32;
}

/**
 * Minimum table width for the columns on screen.
 *
 * Derived rather than the old literal `min-w-[456px]`: with columns hideable, a fixed floor would
 * keep a five-column table scrolling across the width of twelve.
 */
export function standingsTableMinWidth(keys: StandingsColumnKey[]): number {
  return keys.reduce((sum, key) => sum + columnMinWidth(key), NAME_AND_PADDING_W);
}
