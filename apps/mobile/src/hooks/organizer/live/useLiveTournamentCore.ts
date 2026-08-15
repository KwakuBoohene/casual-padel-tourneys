import { useState } from "react";

import { apiGet } from "../../../api/client";
import { isEmailVerifyRequired } from "../../../api/errors";
import type { LiveTournamentState, SetupStep, TournamentResponse } from "../../../types/organizer/tournament";

export interface UseLiveTournamentCoreParams {
  setStep: (step: SetupStep) => void;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}

export function useLiveTournamentCore({
  setStep,
  setErrorText,
  markEmailVerifyRequired
}: UseLiveTournamentCoreParams) {
  const [liveTournament, setLiveTournament] = useState<LiveTournamentState | null>(null);
  const [liveTournamentNameDraft, setLiveTournamentNameDraft] = useState("");
  const [proposedCourts, setProposedCourts] = useState(2);
  const [isEditingCompletedTournament, setIsEditingCompletedTournament] = useState(false);

  const clampProposedCourts = (playersCount: number) => {
    setProposedCourts((previous) => {
      const nextMax = Math.max(1, Math.floor(playersCount / 4));
      return Math.min(Math.max(1, previous), nextMax);
    });
  };

  const applyTournamentUpdate = (data: LiveTournamentState) => {
    setLiveTournament(data);
    setLiveTournamentNameDraft(data.config.name);
  };

  const adoptTournament = (data: LiveTournamentState, editMode: boolean) => {
    setLiveTournament(data);
    setProposedCourts(
      Math.min(Math.max(1, data.config.courts), Math.max(1, Math.floor(data.players.length / 4)))
    );
    setLiveTournamentNameDraft(data.config.name);
    setIsEditingCompletedTournament(editMode);
  };

  const openTournament = async (tournamentId: string, editMode = false) => {
    try {
      setErrorText("");
      const response = await apiGet<TournamentResponse>(`/tournaments/${tournamentId}`);
      adoptTournament(response.data, editMode);
      setStep("LIVE");
    } catch (error) {
      if (isEmailVerifyRequired(error)) {
        markEmailVerifyRequired(error.verifyBy);
        return;
      }
      setErrorText((error as Error).message);
    }
  };

  const refreshTournament = async () => {
    if (!liveTournament) {
      return;
    }
    try {
      const response = await apiGet<TournamentResponse>(`/tournaments/${liveTournament.id}`);
      applyTournamentUpdate(response.data);
      clampProposedCourts(response.data.players.length);
      if (!response.data.rounds.every((round) => round.matches.every((match) => match.completed))) {
        setIsEditingCompletedTournament(false);
      }
    } catch (error) {
      setErrorText((error as Error).message);
    }
  };

  return {
    liveTournament,
    setLiveTournament,
    liveTournamentNameDraft,
    setLiveTournamentNameDraft,
    proposedCourts,
    setProposedCourts,
    isEditingCompletedTournament,
    setIsEditingCompletedTournament,
    clampProposedCourts,
    applyTournamentUpdate,
    adoptTournament,
    openTournament,
    refreshTournament
  };
}
