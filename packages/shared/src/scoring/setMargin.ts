import type { GameWinBy, RegularSetFormat, TiebreakPoints } from "../types/domain.js";

/** Set tiebreak target used at 6–6 when the organizer did not pick one. */
export const DEFAULT_SET_TIEBREAK_TO: TiebreakPoints = 7;

/**
 * How many clear games a side needs to take a set, chosen by set format.
 *
 * Short sets (best of 3 / best of 5 games) are races: first to the target takes it, so 2–1 and
 * 3–2 are finished sets. A full set keeps the classic margin of two — 6–4, 6–3, 7–5, or a
 * tiebreak at 6–6.
 *
 * Deuce mode (Advantage / Golden / Star) decides points inside a single game and must never be
 * used to derive this margin.
 */
export function defaultGameWinByForSetFormat(format: RegularSetFormat): GameWinBy {
  return format === "FULL_SET" ? 2 : 1;
}

/** A full set played to a two-game margin needs a tiebreak target for 6–6. */
export function needsSetTiebreak(format: RegularSetFormat, gameWinBy: GameWinBy): boolean {
  return format === "FULL_SET" && gameWinBy === 2;
}
