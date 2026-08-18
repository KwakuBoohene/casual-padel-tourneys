import { useMemo, useState } from "react";
import type {
  DeuceMode,
  GameWinBy,
  RegularSetFormat,
  RegularScoringConfig,
  ScoringMode,
  TiebreakPoints
} from "@padel/shared";
import { defaultGameWinByForSetFormat, needsSetTiebreak } from "@padel/shared";

export type SettingsPhase = "MODE" | "DETAILS";

export function useScoringModeSettings() {
  const [settingsPhase, setSettingsPhase] = useState<SettingsPhase>("MODE");
  const [scoringMode, setScoringMode] = useState<ScoringMode>("REGULAR");
  const [setFormat, setSetFormat] = useState<RegularSetFormat>("FULL_SET");
  const [deuceMode, setDeuceMode] = useState<DeuceMode>("ADVANTAGE");
  const [gameWinByOverride, setGameWinByOverride] = useState<GameWinBy | null>(null);
  const [setsToWin, setSetsToWin] = useState(1);
  const [setTiebreakTo, setSetTiebreakTo] = useState<TiebreakPoints>(7);
  const [matchTiebreak, setMatchTiebreak] = useState(false);
  const gameWinBy: GameWinBy = gameWinByOverride ?? defaultGameWinByForSetFormat(setFormat);

  const regularScoring: RegularScoringConfig = useMemo(
    () => ({
      setFormat,
      gameWinBy,
      deuceMode,
      setsToWin,
      setTiebreakTo: needsSetTiebreak(setFormat, gameWinBy) ? setTiebreakTo : undefined,
      matchTiebreak: setsToWin > 1 ? matchTiebreak : undefined
    }),
    [setFormat, gameWinBy, deuceMode, setsToWin, setTiebreakTo, matchTiebreak]
  );

  /** Each format carries its own margin, so an override from the previous format is dropped. */
  const changeSetFormat = (next: RegularSetFormat) => {
    setSetFormat(next);
    setGameWinByOverride(null);
  };

  const resetScoringForNewCreate = () => {
    setSettingsPhase("MODE");
    setScoringMode("REGULAR");
    setSetFormat("FULL_SET");
    setDeuceMode("ADVANTAGE");
    setGameWinByOverride(null);
    setSetsToWin(1);
    setSetTiebreakTo(7);
    setMatchTiebreak(false);
  };

  const adoptAmericanoFromEstimator = () => {
    setScoringMode("AMERICANO_POINTS");
    setSettingsPhase("DETAILS");
  };

  const adoptRegularFromEstimator = (nextSetsToWin: number) => {
    setScoringMode("REGULAR");
    setSetsToWin(Math.max(1, Math.trunc(nextSetsToWin) || 1));
    setSettingsPhase("DETAILS");
  };

  return {
    settingsPhase,
    setSettingsPhase,
    scoringMode,
    setScoringMode,
    setFormat,
    setSetFormat: changeSetFormat,
    deuceMode,
    setDeuceMode,
    gameWinBy,
    setGameWinBy: setGameWinByOverride,
    setsToWin,
    setSetsToWin,
    setTiebreakTo,
    setSetTiebreakTo,
    matchTiebreak,
    setMatchTiebreak,
    regularScoring,
    resetScoringForNewCreate,
    adoptAmericanoFromEstimator,
    adoptRegularFromEstimator
  };
}
