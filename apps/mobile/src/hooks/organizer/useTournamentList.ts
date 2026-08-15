import { useEffect, useState } from "react";

import { apiDelete, apiGet } from "../../../api/client";
import { isEmailVerifyRequired } from "../../../api/errors";
import type { TournamentListResponse } from "../types";

export interface UseTournamentListParams {
  authReady: boolean;
  authToken: string | null;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  clearEmailVerifyRequired: () => void;
  openTournament: (tournamentId: string, editMode?: boolean) => Promise<void>;
  onTournamentDeleted: (tournamentId: string) => void;
}

export function useTournamentList({
  authReady,
  authToken,
  setErrorText,
  markEmailVerifyRequired,
  clearEmailVerifyRequired,
  openTournament,
  onTournamentDeleted
}: UseTournamentListParams) {
  const [tournaments, setTournaments] = useState<TournamentListResponse["data"]>([]);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [pendingTournamentAction, setPendingTournamentAction] = useState<"EDIT" | "DELETE" | null>(null);
  const [showTournamentOptionsModal, setShowTournamentOptionsModal] = useState(false);
  const [showTournamentActionConfirmModal, setShowTournamentActionConfirmModal] = useState(false);
  const [suggestedPlayerNames, setSuggestedPlayerNames] = useState<string[]>([]);

  const loadPlayerSuggestions = async () => {
    try {
      const response = await apiGet<{ names: string[] }>("/players/suggestions");
      setSuggestedPlayerNames(response.names ?? []);
    } catch {
      // Ignore suggestion errors; autocomplete will fall back to local names.
    }
  };

  const loadTournaments = async () => {
    try {
      setErrorText("");
      setListRefreshing(true);
      const response = await apiGet<TournamentListResponse>("/tournaments");
      setTournaments(response.data);
      clearEmailVerifyRequired();
      await loadPlayerSuggestions();
    } catch (error) {
      if (isEmailVerifyRequired(error)) {
        markEmailVerifyRequired(error.verifyBy);
        return;
      }
      setErrorText((error as Error).message);
    } finally {
      setListRefreshing(false);
    }
  };

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

  const confirmTournamentAction = async () => {
    if (!selectedTournamentId || !pendingTournamentAction) {
      setShowTournamentActionConfirmModal(false);
      return;
    }
    try {
      setErrorText("");
      if (pendingTournamentAction === "DELETE") {
        await apiDelete<{ ok: boolean }>(`/tournaments/${selectedTournamentId}`);
        setTournaments((previous) => previous.filter((item) => item.id !== selectedTournamentId));
        onTournamentDeleted(selectedTournamentId);
      } else {
        await openTournament(selectedTournamentId, true);
      }
    } catch (error) {
      setErrorText((error as Error).message);
    } finally {
      setShowTournamentActionConfirmModal(false);
      setPendingTournamentAction(null);
      setSelectedTournamentId(null);
    }
  };

  useEffect(() => {
    if (!authReady || !authToken) {
      return;
    }
    void loadTournaments();
  }, [authReady, authToken]);

  return {
    tournaments,
    setTournaments,
    suggestedPlayerNames,
    listRefreshing,
    loadTournaments,
    openTournamentOptions,
    requestTournamentAction,
    confirmTournamentAction,
    showTournamentOptionsModal,
    setShowTournamentOptionsModal,
    showTournamentActionConfirmModal,
    setShowTournamentActionConfirmModal,
    pendingTournamentAction
  };
}
