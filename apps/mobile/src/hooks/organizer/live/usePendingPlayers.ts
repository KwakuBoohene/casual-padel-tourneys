import { useState } from "react";
import type { PlayerGender } from "@padel/shared";

import { apiPost } from "../../../api/client";
import type { LiveTournamentState, TournamentResponse } from "../types";

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
  const [showAddPendingPlayerModal, setShowAddPendingPlayerModal] = useState(false);
  const [pendingPlayerNameDraft, setPendingPlayerNameDraft] = useState("");
  const [pendingPlayerGender, setPendingPlayerGender] = useState<PlayerGender | undefined>(undefined);
  const [showIntegrateConfirmModal, setShowIntegrateConfirmModal] = useState(false);

  const submitAddPendingPlayer = async () => {
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
  };

  const confirmIntegratePendingPlayers = async () => {
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
      setShowIntegrateConfirmModal(false);
    }
  };

  return {
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
    closeAddPendingPlayerModal: () => setShowAddPendingPlayerModal(false),
    submitAddPendingPlayer,
    openIntegrateConfirmModal: () => setShowIntegrateConfirmModal(true),
    closeIntegrateConfirmModal: () => setShowIntegrateConfirmModal(false),
    confirmIntegratePendingPlayers
  };
}
