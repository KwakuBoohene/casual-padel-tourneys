import { useState } from "react";

import type { OpenOrganizerResult } from "../../utilities/organizer/openOrganizerTournament";

export type ConfirmTournamentActionResult =
  | { action: "DELETE"; tournamentId: string }
  | { action: "EDIT"; tournamentId: string; openResult: OpenOrganizerResult | void };

export function useTournamentListModals() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [pendingTournamentAction, setPendingTournamentAction] = useState<"EDIT" | "DELETE" | null>(
    null
  );
  const [showTournamentOptionsModal, setShowTournamentOptionsModal] = useState(false);
  const [showTournamentActionConfirmModal, setShowTournamentActionConfirmModal] = useState(false);

  const openTournamentOptions = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setPendingTournamentAction(null);
    setShowTournamentOptionsModal(true);
  };

  const requestTournamentAction = (action: "EDIT" | "DELETE") => {
    setPendingTournamentAction(action);
    setShowTournamentOptionsModal(false);
    setShowTournamentActionConfirmModal(true);
  };

  const clearActionSelection = () => {
    setShowTournamentActionConfirmModal(false);
    setPendingTournamentAction(null);
    setSelectedTournamentId(null);
  };

  return {
    selectedTournamentId,
    pendingTournamentAction,
    showTournamentOptionsModal,
    setShowTournamentOptionsModal,
    showTournamentActionConfirmModal,
    setShowTournamentActionConfirmModal,
    openTournamentOptions,
    requestTournamentAction,
    clearActionSelection
  };
}
