import { useMemo, useState } from "react";
import type { SchedulingMode, ScoringMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { computeEstimate } from "../../utilities/organizer/utils";
import { sanitizeWholeNumberInput } from "../../utilities/organizer/sanitizeInput";

import { useScoringModeSettings } from "./useScoringModeSettings";

export interface UseMatchSettingsParams {
  mode: TournamentMode;
  variant: TournamentVariant;
  effectiveSchedulingMode: SchedulingMode;
  playersCount: number;
}

export function useMatchSettings({
  mode,
  variant,
  effectiveSchedulingMode,
  playersCount
}: UseMatchSettingsParams) {
  const [courtsText, setCourtsText] = useState("2");
  const [pointsText, setPointsText] = useState("24");
  const [targetGamesText, setTargetGamesText] = useState("4");
  const [tournamentTimeText, setTournamentTimeText] = useState("90");
  const scoring = useScoringModeSettings();
  const [contributeToCareerLeaderboard, setContributeToCareerLeaderboard] = useState(true);

  const estimate = useMemo(
    () =>
      mode === "KING_OF_THE_COURT"
        ? null
        : computeEstimate({
            courtsText,
            pointsText,
            mode,
            variant,
            schedulingMode: effectiveSchedulingMode,
            targetGamesText,
            tournamentTimeText,
            playersCount,
            scoringMode: scoring.scoringMode,
            regularSetsToWin: scoring.setsToWin
          }),
    [
      courtsText,
      effectiveSchedulingMode,
      mode,
      pointsText,
      playersCount,
      scoring.scoringMode,
      scoring.setsToWin,
      targetGamesText,
      tournamentTimeText,
      variant
    ]
  );

  const applySettings = (next: {
    courtsText: string;
    pointsText: string;
    targetGamesText: string;
    tournamentTimeText: string;
    scoringMode?: ScoringMode;
    setsToWin?: number;
  }) => {
    setCourtsText(sanitizeWholeNumberInput(next.courtsText));
    setPointsText(sanitizeWholeNumberInput(next.pointsText));
    setTargetGamesText(sanitizeWholeNumberInput(next.targetGamesText));
    setTournamentTimeText(sanitizeWholeNumberInput(next.tournamentTimeText));
    if (next.scoringMode === "REGULAR") {
      scoring.adoptRegularFromEstimator(next.setsToWin ?? 1);
    } else {
      scoring.adoptAmericanoFromEstimator();
    }
    setContributeToCareerLeaderboard(true);
  };

  const prepareSettingsForMode = (nextMode: TournamentMode) => {
    setContributeToCareerLeaderboard(true);
    if (nextMode === "MEXICANO") {
      scoring.adoptAmericanoFromEstimator();
      return;
    }
    scoring.resetScoringForNewCreate();
  };

  return {
    courtsText,
    pointsText,
    targetGamesText,
    tournamentTimeText,
    estimate,
    applySettings,
    prepareSettingsForMode,
    contributeToCareerLeaderboard,
    setContributeToCareerLeaderboard,
    onChangeCourtsValue: (value: string) => setCourtsText(sanitizeWholeNumberInput(value)),
    onChangePointsValue: (value: string) => setPointsText(sanitizeWholeNumberInput(value)),
    onChangeTargetGamesValue: (value: string) => setTargetGamesText(sanitizeWholeNumberInput(value)),
    onChangeTournamentTimeValue: (value: string) => setTournamentTimeText(sanitizeWholeNumberInput(value)),
    ...scoring
  };
}
