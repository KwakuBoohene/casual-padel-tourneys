import { useState } from "react";

import type { LiveTournamentState } from "../../../types/organizer/tournament";

import { submitRoundScoreDrafts, type LiveRound } from "../../../utilities/organizer/scoreDraftActions";
import { useScoreDraftPersistence } from "./useScoreDraftPersistence";
import { useScoreEntry } from "./useScoreEntry";

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
  const [focusSubmitMatchId, setFocusSubmitMatchId] = useState<string | null>(null);
  const entry = useScoreEntry({
    liveTournament,
    scoreInputs,
    setScoreInputs,
    onTournamentUpdated,
    setErrorText
  });

  const updateScoreInput = (matchId: string, side: "scoreA" | "scoreB", value: string) => {
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

  const submitRoundScores = async () => {
    if (!liveTournament || !displayedRound) return;
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
    focusSubmitMatchId,
    setFocusSubmitMatchId,
    ...entry
  };
}
