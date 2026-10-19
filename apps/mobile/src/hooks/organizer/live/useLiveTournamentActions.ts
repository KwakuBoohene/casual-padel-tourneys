import { useState } from "react";

import { useSubmission } from "../../useSubmission";

import { apiPost } from "../../../api/client";
import type { LiveTournamentState, TournamentResponse } from "../../../types/organizer/tournament";
import { finishLiveTournament } from "../../../utilities/organizer/finishLiveTournament";

export interface UseLiveTournamentActionsParams {
  liveTournament: LiveTournamentState | null;
  liveTournamentNameDraft: string;
  proposedCourts: number;
  canFinishNight: boolean;
  applyTournamentUpdate: (data: LiveTournamentState) => void;
  setLiveTournament: (data: LiveTournamentState | null) => void;
  clampProposedCourts: (playersCount: number) => void;
  setIsEditingCompletedTournament: (value: boolean) => void;
  setErrorText: (value: string) => void;
}

export function useLiveTournamentActions(params: UseLiveTournamentActionsParams) {
  const { liveTournament, setErrorText } = params;
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [showLiveOptionsModal, setShowLiveOptionsModal] = useState(false);
  const [showAdjustCourtsConfirmModal, setShowAdjustCourtsConfirmModal] = useState(false);
  const submission = useSubmission();
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const runAction = (name: string, action: () => Promise<void>) =>
    submission.run(async () => {
      setSavingAction(name);
      try {
        await action();
      } finally {
        setSavingAction(null);
      }
    });

  const finishTournament = () =>
    runAction("finish", async () => {
      if (!liveTournament) return;
      await finishLiveTournament({
        liveTournament,
        canFinishNight: params.canFinishNight,
        applyTournamentUpdate: params.applyTournamentUpdate,
        setIsEditingCompletedTournament: params.setIsEditingCompletedTournament,
        onFinished: () => setShowFinishConfirmModal(false),
        setErrorText
      });
    });

  const generateNextMexicanoRound = () =>
    runAction("next-round", async () => {
      if (!liveTournament || liveTournament.config.mode !== "MEXICANO") return;
      try {
        setErrorText("");
        const response = await apiPost<TournamentResponse>("/tournaments/next-round", {
          tournamentId: liveTournament.id,
          expectedVersion: liveTournament.version
        });
        params.applyTournamentUpdate(response.data);
      } catch (error) {
        setErrorText((error as Error).message);
      }
    });

  const saveTournamentName = () =>
    runAction("name", async () => {
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
      } catch (error) {
        setErrorText((error as Error).message);
      }
    });

  const adjustTournamentCourts = () =>
    runAction("courts", async () => {
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
      }
    });

  return {
    showEditConfirmModal,
    setShowEditConfirmModal,
    showFinishConfirmModal,
    setShowFinishConfirmModal: (value: boolean) => {
      if (!submission.isPending()) setShowFinishConfirmModal(value);
    },
    showLiveOptionsModal,
    setShowLiveOptionsModal,
    showAdjustCourtsConfirmModal,
    setShowAdjustCourtsConfirmModal: (value: boolean) => {
      if (!submission.isPending()) setShowAdjustCourtsConfirmModal(value);
    },
    generatingNextRound: savingAction === "next-round",
    finishingTournament: savingAction === "finish",
    savingTournamentName: savingAction === "name",
    adjustingCourts: savingAction === "courts",
    savingTournament: submission.saving,
    finishTournament,
    generateNextMexicanoRound,
    saveTournamentName,
    adjustTournamentCourts
  };
}
