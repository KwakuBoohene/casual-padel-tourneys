import type { RegularScoringConfig } from "@padel/shared";
import {
  DEFAULT_SET_TIEBREAK_TO,
  defaultGameWinByForSetFormat,
  deuceModeLabel,
  needsSetTiebreak
} from "@padel/shared";

import type { KohDeuceMode, KohMatchFormatChoice } from "../../types/koh/create";

export function regularScoringFromDraft(
  matchFormat: KohMatchFormatChoice,
  deuceMode: KohDeuceMode
): RegularScoringConfig {
  const gameWinBy = defaultGameWinByForSetFormat(matchFormat);
  return {
    setFormat: matchFormat,
    gameWinBy,
    deuceMode,
    setsToWin: 1,
    setTiebreakTo: needsSetTiebreak(matchFormat, gameWinBy) ? DEFAULT_SET_TIEBREAK_TO : undefined
  };
}

export function formatLabel(matchFormat: KohMatchFormatChoice): string {
  if (matchFormat === "FULL_SET") return "Full set to 6";
  if (matchFormat === "BO3_GAMES") return "Best of 3";
  return "Best of 5";
}

export function deuceLabel(deuceMode: KohDeuceMode): string {
  return deuceModeLabel(deuceMode);
}
