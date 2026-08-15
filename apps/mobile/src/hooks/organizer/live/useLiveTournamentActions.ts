import { useState, type Dispatch, type SetStateAction } from "react";

import { apiPost } from "../../../api/client";
import type { LiveTournamentState, SetupStep, TournamentListResponse, TournamentResponse } from "../../../types/organizer/tournament";

export interface UseLiveTournamentActionsParams {
  liveTournament: LiveTournamentState | null;
  liveTournamentNameDraft: string;
  proposedCourts: number;
  isTournamentCompleted: boolean;
  applyTournamentUpdate: (data: LiveTournamentState) => void;
  setLiveTournament: (data: LiveTournamentState) => void;
  clampProposedCourts: (playersCount: number) => void;
  setIsEditingCompletedTournament: (value: boolean) => void;
  setTournaments: Dispatch<SetStateAction<TournamentListResponse["data"]>>;
  setStep: (step: SetupStep) => void;
  setErrorText: (value: string) => void;
}

export function useLiveTournamentActions(params: UseLiveTournamentActionsParams) {
  const { liveTournament, setErrorText, setTournaments } = params;
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showLiveOptionsModal, setShowLiveOptionsModal] = useState(false);
  const [showAdjustCourtsConfirmModal, setShowAdjustCourtsConfirmModal] = useState(false);

  const finishTournament = () => {
    if (!params.isTournamentCompleted) {
      setErrorText("Finish is only available after all round matches have scores.");
      return;
    }
    if (liveTournament) {
      setTournaments((previous) =>
        previous.map((item) => (item.id === liveTournament.id ? liveTournament : item))
      );
    }
    params.setIsEditingCompletedTournament(false);
    params.setStep("LEADERBOARD");
  };

  const saveTournamentName = async () => {
    if (!liveTournament) {
      return;
    }
    const newName = params.liveTournamentNameDraft.trim();
    if (newName.length < 2) {
      setErrorText("Tournament name must be at least 2 characters.");
      return;
    }
    try {
      setErrorText("");
      const response = await apiPost<TournamentResponse>("/tournaments/rename", {
        tournamentId: liveTournament.id,
        newName
      });
      params.applyTournamentUpdate(response.data);
      setTournaments((previous) =>
        previous.map((item) => (item.id === response.data.id ? response.data : item))
      );
    } catch (error) {
      setErrorText((error as Error).message);
    }
  };

  const adjustTournamentCourts = async () => {
    if (!liveTournament) {
      return;
    }
    try {
      setErrorText("");
      const response = await apiPost<TournamentResponse>("/tournaments/adjust-courts", {
        tournamentId: liveTournament.id,
        courts: params.proposedCourts,
        expectedVersion: liveTournament.version
      });
      params.setLiveTournament(response.data);
      params.clampProposedCourts(response.data.players.length);
      setShowLiveOptionsModal(false);
      setShowAdjustCourtsConfirmModal(false);
    } catch (error) {
      setErrorText((error as Error).message);
      setShowAdjustCourtsConfirmModal(false);
    }
  };

  return {
    showEditConfirmModal,
    setShowEditConfirmModal,
    showLiveOptionsModal,
    setShowLiveOptionsModal,
    showAdjustCourtsConfirmModal,
    setShowAdjustCourtsConfirmModal,
    finishTournament,
    saveTournamentName,
    adjustTournamentCourts
  };
}
