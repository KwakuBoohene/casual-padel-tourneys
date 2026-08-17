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
  const [showCareerDeleteModal, setShowCareerDeleteModal] = useState(false);

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

  const openCareerDelete = () => {
    setShowTournamentActionConfirmModal(false);
    setShowCareerDeleteModal(true);
  };

  const clearActionSelection = () => {
    setShowTournamentActionConfirmModal(false);
    setShowCareerDeleteModal(false);
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
    showCareerDeleteModal,
    openTournamentOptions,
    requestTournamentAction,
    openCareerDelete,
    clearActionSelection
  };
}
