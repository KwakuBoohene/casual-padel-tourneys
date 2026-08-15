import { useMemo, useState } from "react";
import type {
  GameWinBy,
  RegularSetFormat,
  RegularScoringConfig,
  ScoringMode,
  TiebreakPoints
} from "@padel/shared";

export type SettingsPhase = "MODE" | "DETAILS";

export function useScoringModeSettings() {
  const [settingsPhase, setSettingsPhase] = useState<SettingsPhase>("MODE");
  const [scoringMode, setScoringMode] = useState<ScoringMode>("REGULAR");
  const [setFormat, setSetFormat] = useState<RegularSetFormat>("FULL_SET");
  const [gameWinBy, setGameWinBy] = useState<GameWinBy>(2);
  const [setsToWin, setSetsToWin] = useState(1);
  const [setTiebreakTo, setSetTiebreakTo] = useState<TiebreakPoints>(7);
  const [matchTiebreak, setMatchTiebreak] = useState(false);

  const regularScoring: RegularScoringConfig = useMemo(
    () => ({
      setFormat,
      gameWinBy,
      setsToWin,
      setTiebreakTo: setFormat === "FULL_SET" && gameWinBy === 2 ? setTiebreakTo : undefined,
      matchTiebreak: setsToWin > 1 ? matchTiebreak : undefined
    }),
    [setFormat, gameWinBy, setsToWin, setTiebreakTo, matchTiebreak]
  );

  const resetScoringForNewCreate = () => {
    setSettingsPhase("MODE");
    setScoringMode("REGULAR");
    setSetFormat("FULL_SET");
    setGameWinBy(2);
    setSetsToWin(1);
    setSetTiebreakTo(7);
    setMatchTiebreak(false);
  };

  const adoptAmericanoFromEstimator = () => {
    setScoringMode("AMERICANO_POINTS");
    setSettingsPhase("DETAILS");
  };

  return {
    settingsPhase,
    setSettingsPhase,
    scoringMode,
    setScoringMode,
    setFormat,
    setSetFormat,
    gameWinBy,
    setGameWinBy,
    setsToWin,
    setSetsToWin,
    setTiebreakTo,
    setSetTiebreakTo,
    matchTiebreak,
    setMatchTiebreak,
    regularScoring,
    resetScoringForNewCreate,
    adoptAmericanoFromEstimator
  };
}
