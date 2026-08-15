import { useState, type Dispatch, type SetStateAction } from "react";

import { apiPost } from "../../../api/client";
import type {
  LiveTournamentState,
  SetupStep,
  TournamentListResponse,
  TournamentResponse
} from "../../../types/organizer/tournament";

export interface UseLiveTournamentActionsParams {
  liveTournament: LiveTournamentState | null;
  liveTournamentNameDraft: string;
  proposedCourts: number;
  canFinishNight: boolean;
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
  const [generatingNextRound, setGeneratingNextRound] = useState(false);

  const finishTournament = () => {
    if (!params.canFinishNight) {
      setErrorText(
        liveTournament?.config.mode === "MEXICANO"
          ? "Score the current round before ending the night."
          : "Finish is only available after all round matches have scores."
      );
      return;
    }
    if (liveTournament) {
      setTournaments((prev) => prev.map((item) => (item.id === liveTournament.id ? liveTournament : item)));
    }
    params.setIsEditingCompletedTournament(false);
    params.setStep("LEADERBOARD");
  };

  const generateNextMexicanoRound = async () => {
    if (!liveTournament || liveTournament.config.mode !== "MEXICANO") return;
    try {
      setErrorText("");
      setGeneratingNextRound(true);
      const response = await apiPost<TournamentResponse>("/tournaments/next-round", {
        tournamentId: liveTournament.id,
        expectedVersion: liveTournament.version
      });
      params.applyTournamentUpdate(response.data);
    } catch (error) {
      setErrorText((error as Error).message);
    } finally {
      setGeneratingNextRound(false);
    }
  };

  const saveTournamentName = async () => {
    if (!liveTournament) return;
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
      setTournaments((prev) => prev.map((item) => (item.id === response.data.id ? response.data : item)));
    } catch (error) {
      setErrorText((error as Error).message);
    }
  };

  const adjustTournamentCourts = async () => {
    if (!liveTournament) return;
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
    generatingNextRound,
    finishTournament,
    generateNextMexicanoRound,
    saveTournamentName,
    adjustTournamentCourts
  };
}
