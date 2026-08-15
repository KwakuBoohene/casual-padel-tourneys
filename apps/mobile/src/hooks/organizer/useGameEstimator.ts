import { useMemo, useState } from "react";
import type { SchedulingMode, ScoringMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { computeEstimate } from "../../utilities/organizer/utils";
import { sanitizeWholeNumberInput } from "../../utilities/organizer/sanitizeInput";

export function useGameEstimator() {
  const [estimatorMode, setEstimatorMode] = useState<TournamentMode>("AMERICANO");
  const [estimatorVariant, setEstimatorVariant] = useState<TournamentVariant>("CLASSIC");
  const [estimatorSchedulingMode, setEstimatorSchedulingMode] = useState<SchedulingMode>("TARGET_GAMES");
  const [estimatorScoringMode, setEstimatorScoringMode] = useState<ScoringMode>("REGULAR");
  const [estimatorSetsToWin, setEstimatorSetsToWin] = useState(1);
  const [estimatorUsersText, setEstimatorUsersText] = useState("8");
  const [estimatorCourtsText, setEstimatorCourtsText] = useState("2");
  const [estimatorPointsText, setEstimatorPointsText] = useState("24");
  const [estimatorTargetGamesText, setEstimatorTargetGamesText] = useState("8");
  const [estimatorTournamentTimeText, setEstimatorTournamentTimeText] = useState("90");

  const effectiveEstimatorSchedulingMode: SchedulingMode =
    estimatorMode === "MEXICANO" ? "TOTAL_TIME" : estimatorSchedulingMode;

  const estimatorUsers = Number(estimatorUsersText);
  const estimator = useMemo(
    () =>
      estimatorMode === "KING_OF_THE_HILL"
        ? null
        : computeEstimate({
            courtsText: estimatorCourtsText,
            pointsText: estimatorPointsText,
            mode: estimatorMode,
            schedulingMode: effectiveEstimatorSchedulingMode,
            targetGamesText: estimatorTargetGamesText,
            tournamentTimeText: estimatorTournamentTimeText,
            playersCount: Number.isFinite(estimatorUsers) ? estimatorUsers : 0,
            scoringMode: estimatorMode === "MEXICANO" ? "AMERICANO_POINTS" : estimatorScoringMode,
            regularSetsToWin: estimatorSetsToWin
          }),
    [
      effectiveEstimatorSchedulingMode,
      estimatorCourtsText,
      estimatorMode,
      estimatorPointsText,
      estimatorScoringMode,
      estimatorSetsToWin,
      estimatorTargetGamesText,
      estimatorTournamentTimeText,
      estimatorUsers
    ]
  );

  return {
    estimatorMode,
    setEstimatorMode: (value: TournamentMode) => {
      setEstimatorMode(value);
      if (value === "MEXICANO") {
        setEstimatorScoringMode("AMERICANO_POINTS");
        setEstimatorUsersText((previous) => (Number(previous) < 8 ? "8" : previous));
      }
    },
    estimatorVariant,
    setEstimatorVariant,
    estimatorSchedulingMode,
    setEstimatorSchedulingMode,
    estimatorScoringMode,
    setEstimatorScoringMode,
    estimatorSetsToWin,
    setEstimatorSetsToWin,
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
