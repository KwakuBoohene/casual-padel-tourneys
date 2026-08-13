import { useMemo, useState } from "react";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { computeEstimate } from "../utils";

import { sanitizeWholeNumberInput } from "./sanitizeInput";

export function useGameEstimator() {
  const [estimatorMode, setEstimatorMode] = useState<TournamentMode>("AMERICANO");
  const [estimatorVariant, setEstimatorVariant] = useState<TournamentVariant>("CLASSIC");
  const [estimatorSchedulingMode, setEstimatorSchedulingMode] = useState<SchedulingMode>("TARGET_GAMES");
  const [estimatorUsersText, setEstimatorUsersText] = useState("8");
  const [estimatorCourtsText, setEstimatorCourtsText] = useState("2");
  const [estimatorPointsText, setEstimatorPointsText] = useState("24");
  const [estimatorTargetGamesText, setEstimatorTargetGamesText] = useState("4");
  const [estimatorTournamentTimeText, setEstimatorTournamentTimeText] = useState("90");

  const effectiveEstimatorSchedulingMode: SchedulingMode =
    estimatorMode === "MEXICANO" ? "TOTAL_TIME" : estimatorSchedulingMode;

  const estimatorUsers = Number(estimatorUsersText);
  const estimator = useMemo(
    () =>
      computeEstimate({
        courtsText: estimatorCourtsText,
        pointsText: estimatorPointsText,
        mode: estimatorMode,
        schedulingMode: effectiveEstimatorSchedulingMode,
        targetGamesText: estimatorTargetGamesText,
        tournamentTimeText: estimatorTournamentTimeText,
        playersCount: Number.isFinite(estimatorUsers) ? estimatorUsers : 0
      }),
    [
      effectiveEstimatorSchedulingMode,
      estimatorCourtsText,
      estimatorMode,
      estimatorPointsText,
      estimatorTargetGamesText,
      estimatorTournamentTimeText,
      estimatorUsers
    ]
  );

  return {
    estimatorMode,
    setEstimatorMode,
    estimatorVariant,
    setEstimatorVariant,
    estimatorSchedulingMode,
    setEstimatorSchedulingMode,
    effectiveEstimatorSchedulingMode,
    estimatorUsersText,
    estimatorCourtsText,
    estimatorPointsText,
    estimatorTargetGamesText,
    estimatorTournamentTimeText,
    estimator,
    onChangeEstimatorUsersValue: (value: string) => setEstimatorUsersText(sanitizeWholeNumberInput(value)),
    onChangeEstimatorCourtsValue: (value: string) => setEstimatorCourtsText(sanitizeWholeNumberInput(value)),
    onChangeEstimatorPointsValue: (value: string) => setEstimatorPointsText(sanitizeWholeNumberInput(value)),
    onChangeEstimatorTargetGamesValue: (value: string) =>
      setEstimatorTargetGamesText(sanitizeWholeNumberInput(value)),
    onChangeEstimatorTournamentTimeValue: (value: string) =>
      setEstimatorTournamentTimeText(sanitizeWholeNumberInput(value))
  };
}
