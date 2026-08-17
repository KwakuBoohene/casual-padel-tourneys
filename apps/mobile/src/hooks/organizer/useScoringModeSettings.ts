import { useMemo, useState } from "react";
import type {
  DeuceMode,
  GameWinBy,
  RegularSetFormat,
  RegularScoringConfig,
  ScoringMode,
  TiebreakPoints
} from "@padel/shared";
import { gameWinByForDeuceMode } from "@padel/shared";

export type SettingsPhase = "MODE" | "DETAILS";

export function useScoringModeSettings() {
  const [settingsPhase, setSettingsPhase] = useState<SettingsPhase>("MODE");
  const [scoringMode, setScoringMode] = useState<ScoringMode>("REGULAR");
  const [setFormat, setSetFormat] = useState<RegularSetFormat>("FULL_SET");
  const [deuceMode, setDeuceMode] = useState<DeuceMode>("ADVANTAGE");
  const [setsToWin, setSetsToWin] = useState(1);
  const [setTiebreakTo, setSetTiebreakTo] = useState<TiebreakPoints>(7);
  const [matchTiebreak, setMatchTiebreak] = useState(false);
  const gameWinBy: GameWinBy = gameWinByForDeuceMode(deuceMode);

  const regularScoring: RegularScoringConfig = useMemo(
    () => ({
      setFormat,
      gameWinBy,
      deuceMode,
      setsToWin,
      setTiebreakTo: setFormat === "FULL_SET" && gameWinBy === 2 ? setTiebreakTo : undefined,
      matchTiebreak: setsToWin > 1 ? matchTiebreak : undefined
    }),
    [setFormat, gameWinBy, deuceMode, setsToWin, setTiebreakTo, matchTiebreak]
  );

  const resetScoringForNewCreate = () => {
    setSettingsPhase("MODE");
    setScoringMode("REGULAR");
    setSetFormat("FULL_SET");
    setDeuceMode("ADVANTAGE");
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
    setSetFormat,
    deuceMode,
    setDeuceMode,
    gameWinBy,
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
