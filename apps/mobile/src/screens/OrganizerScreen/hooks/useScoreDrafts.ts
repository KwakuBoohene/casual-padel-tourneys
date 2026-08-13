import { useState } from "react";

import type { LiveTournamentState } from "../types";

import {
  applyPickedScore,
  findMatchInTournament,
  submitRoundScoreDrafts,
  type LiveRound,
  type ScoreSide
} from "./scoreDraftActions";
import { useScoreDraftPersistence } from "./useScoreDraftPersistence";

export interface UseScoreDraftsParams {
  liveTournament: LiveTournamentState | null;
  displayedRound: LiveRound | null;
  onTournamentUpdated: (data: LiveTournamentState) => void;
  setErrorText: (value: string) => void;
}

export function useScoreDrafts({
  liveTournament,
  displayedRound,
  onTournamentUpdated,
  setErrorText
}: UseScoreDraftsParams) {
  const { scoreInputs, setScoreInputs } = useScoreDraftPersistence(liveTournament?.id);
  const [scorePicker, setScorePicker] = useState<{ matchId: string; side: ScoreSide } | null>(null);
  const [suppressNextScorePickerOpen, setSuppressNextScorePickerOpen] = useState<{
    matchId: string;
    side: ScoreSide;
  } | null>(null);
  const [focusSubmitMatchId, setFocusSubmitMatchId] = useState<string | null>(null);

  const updateScoreInput = (matchId: string, side: ScoreSide, value: string) => {
    setScoreInputs((previous) => ({
      ...previous,
      [matchId]: {
        scoreA: previous[matchId]?.scoreA ?? "",
        scoreB: previous[matchId]?.scoreB ?? "",
        [side]: value
      }
    }));
  };

  const clearScoreForMatch = (matchId: string) => {
    setScoreInputs((previous) => {
      const next = { ...previous };
      delete next[matchId];
      return next;
    });
  };

  const pickScoreFromSheet = (value: number) => {
    if (!liveTournament || !scorePicker) {
      return;
    }
    const { matchId, side } = scorePicker;
    const match = findMatchInTournament(liveTournament, matchId);
    const existing = scoreInputs[matchId];
    setScoreInputs((previous) =>
      applyPickedScore({
        previous,
        existing,
        match,
        matchId,
        side,
        value,
        pointsPerMatch: liveTournament.config.pointsPerMatch
      })
    );
    setSuppressNextScorePickerOpen(scorePicker);
    setFocusSubmitMatchId(matchId);
    setScorePicker(null);
  };

  const submitRoundScores = async () => {
    if (!liveTournament || !displayedRound) {
      return;
    }
    await submitRoundScoreDrafts({
      tournament: liveTournament,
      round: displayedRound,
      scoreInputs,
      setScoreInputs,
      onTournamentUpdated,
      setErrorText
    });
  };

  return {
    scoreInputs,
    updateScoreInput,
    clearScoreForMatch,
    submitRoundScores,
    pickScoreFromSheet,
    scorePicker,
    setScorePicker,
    suppressNextScorePickerOpen,
    setSuppressNextScorePickerOpen,
    focusSubmitMatchId,
    setFocusSubmitMatchId
  };
}
