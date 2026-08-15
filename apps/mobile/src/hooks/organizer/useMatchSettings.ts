import { useMemo, useState } from "react";
import type { SchedulingMode, ScoringMode, TournamentMode } from "@padel/shared";

import { computeEstimate } from "../../utilities/organizer/utils";
import { sanitizeWholeNumberInput } from "../../utilities/organizer/sanitizeInput";

import { useScoringModeSettings } from "./useScoringModeSettings";

export interface UseMatchSettingsParams {
  mode: TournamentMode;
  effectiveSchedulingMode: SchedulingMode;
  playersCount: number;
}

export function useMatchSettings({ mode, effectiveSchedulingMode, playersCount }: UseMatchSettingsParams) {
  const [courtsText, setCourtsText] = useState("2");
  const [pointsText, setPointsText] = useState("24");
  const [targetGamesText, setTargetGamesText] = useState("4");
  const [tournamentTimeText, setTournamentTimeText] = useState("90");
  const scoring = useScoringModeSettings();

  const estimate = useMemo(
    () =>
      mode === "KING_OF_THE_HILL"
        ? null
        : computeEstimate({
            courtsText,
            pointsText,
            mode,
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
      tournamentTimeText
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
  };

  const prepareSettingsForMode = (nextMode: TournamentMode) => {
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
    onChangeCourtsValue: (value: string) => setCourtsText(sanitizeWholeNumberInput(value)),
    onChangePointsValue: (value: string) => setPointsText(sanitizeWholeNumberInput(value)),
    onChangeTargetGamesValue: (value: string) => setTargetGamesText(sanitizeWholeNumberInput(value)),
    onChangeTournamentTimeValue: (value: string) => setTournamentTimeText(sanitizeWholeNumberInput(value)),
    ...scoring
  };
}
