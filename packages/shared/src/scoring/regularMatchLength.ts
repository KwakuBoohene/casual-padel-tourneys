import type { RegularScoringConfig } from "../types/domain.js";

/** Maximum `setsToWin` — best of 7 sets (first to 4). */
export const REGULAR_SETS_TO_WIN_MAX = 4;

/**
 * Organizer-facing match length presets → `regularScoring` fields.
 * Per-set format (`setFormat` / `gameWinBy` / `setTiebreakTo`) is chosen separately.
 */
export const REGULAR_MATCH_LENGTH_PRESETS = {
  ONE_SET: { setsToWin: 1, matchTiebreak: false },
  TWO_SETS_MATCH_TB: { setsToWin: 2, matchTiebreak: true },
  BEST_OF_3: { setsToWin: 2, matchTiebreak: false },
  BEST_OF_5: { setsToWin: 3, matchTiebreak: false },
  BEST_OF_7: { setsToWin: 4, matchTiebreak: false }
} as const;

export type RegularMatchLengthPresetId = keyof typeof REGULAR_MATCH_LENGTH_PRESETS;

export type RegularMatchLengthFields = Pick<RegularScoringConfig, "setsToWin" | "matchTiebreak">;

/** Apply a locked UI preset onto partial regular scoring fields. */
export function regularMatchLengthFromPreset(
  preset: RegularMatchLengthPresetId
): RegularMatchLengthFields {
  const fields = REGULAR_MATCH_LENGTH_PRESETS[preset];
  return { setsToWin: fields.setsToWin, matchTiebreak: fields.matchTiebreak };
}

/**
 * Max completed sets before the match must be decided.
 * Match-TB format: play until each side has `setsToWin - 1`, then match tiebreak.
 * Best-of-N: up to `2 * setsToWin - 1` sets.
 */
export function maxSetsForRegularMatch(config: Pick<RegularScoringConfig, "setsToWin" | "matchTiebreak">): number {
  if (config.matchTiebreak) {
    return Math.max(0, 2 * (config.setsToWin - 1));
  }
  return 2 * config.setsToWin - 1;
}
