import type { RegularScoringConfig } from "@padel/shared";
import { deuceModeLabel, gameWinByForDeuceMode } from "@padel/shared";

import type { KohDeuceMode, KohMatchFormatChoice } from "../../types/koh/create";

export function regularScoringFromDraft(
  matchFormat: KohMatchFormatChoice,
  deuceMode: KohDeuceMode
): RegularScoringConfig {
  const gameWinBy = gameWinByForDeuceMode(deuceMode);
  if (matchFormat === "FULL_SET") {
    return {
      setFormat: "FULL_SET",
      gameWinBy: gameWinBy === 2 ? 2 : 1,
      deuceMode,
      setsToWin: 1,
      setTiebreakTo: gameWinBy === 2 ? 7 : undefined
    };
  }
  return {
    setFormat: matchFormat,
    gameWinBy,
    deuceMode,
    setsToWin: 1
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
