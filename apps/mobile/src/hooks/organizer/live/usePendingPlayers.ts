import { useState } from "react";
import type { PlayerGender } from "@padel/shared";

import { useSubmission } from "../../useSubmission";

import { apiPost } from "../../../api/client";
import type { LiveTournamentState, TournamentResponse } from "../../../types/organizer/tournament";

export interface UsePendingPlayersParams {
  liveTournament: LiveTournamentState | null;
  setLiveTournament: (data: LiveTournamentState) => void;
  clampProposedCourts: (playersCount: number) => void;
  setErrorText: (value: string) => void;
}

export function usePendingPlayers({
  liveTournament,
  setLiveTournament,
  clampProposedCourts,
  setErrorText
}: UsePendingPlayersParams) {
  const submission = useSubmission();
  const [pendingAction, setPendingAction] = useState<"add" | "integrate" | null>(null);
  const runAction = (name: "add" | "integrate", action: () => Promise<void>) =>
    submission.run(async () => {
      setPendingAction(name);
      try {
        await action();
      } finally {
        setPendingAction(null);
      }
    });
  const [showAddPendingPlayerModal, setShowAddPendingPlayerModal] = useState(false);
  const [pendingPlayerNameDraft, setPendingPlayerNameDraft] = useState("");
  const [pendingPlayerGender, setPendingPlayerGender] = useState<PlayerGender | undefined>(undefined);
  const [showIntegrateConfirmModal, setShowIntegrateConfirmModal] = useState(false);

  const submitAddPendingPlayer = () =>
    runAction("add", async () => {
      if (!liveTournament) return;
      const name = pendingPlayerNameDraft.trim();
      if (!name) {
        setErrorText("Player name cannot be empty.");
        return;
      }
      try {
        setErrorText("");
        const response = await apiPost<TournamentResponse>("/tournaments/add-pending-player", {
          tournamentId: liveTournament.id,
          name,
          gender: liveTournament.config.variant === "MIXED" ? pendingPlayerGender : undefined,
          expectedVersion: liveTournament.version
        });
        setLiveTournament(response.data);
        setShowAddPendingPlayerModal(false);
      } catch (error) {
        setErrorText((error as Error).message);
      }
    });

  const confirmIntegratePendingPlayers = () =>
    runAction("integrate", async () => {
      if (!liveTournament) return;
      try {
        setErrorText("");
        const response = await apiPost<TournamentResponse>("/tournaments/integrate-pending", {
          tournamentId: liveTournament.id,
          expectedVersion: liveTournament.version
        });
        setLiveTournament(response.data);
        clampProposedCourts(response.data.players.length);
        setShowIntegrateConfirmModal(false);
      } catch (error) {
        setErrorText((error as Error).message);
      }
    });

  return {
    addingPendingPlayer: pendingAction === "add",
    integratingPendingPlayers: pendingAction === "integrate",
    showAddPendingPlayerModal,
    pendingPlayerNameDraft,
    setPendingPlayerNameDraft,
    pendingPlayerGender,
    setPendingPlayerGender,
    showIntegrateConfirmModal,
    openAddPendingPlayerModal: () => {
      setPendingPlayerNameDraft("");
      setPendingPlayerGender(undefined);
      setShowAddPendingPlayerModal(true);
    },
    closeAddPendingPlayerModal: () => {
      if (!submission.isPending()) setShowAddPendingPlayerModal(false);
    },
    submitAddPendingPlayer,
    openIntegrateConfirmModal: () => setShowIntegrateConfirmModal(true),
    closeIntegrateConfirmModal: () => {
      if (!submission.isPending()) setShowIntegrateConfirmModal(false);
    },
    confirmIntegratePendingPlayers
  };
}
