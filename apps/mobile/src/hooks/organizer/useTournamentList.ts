import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { apiDelete, apiGet } from "../../api/client";
import { isEmailVerifyRequired } from "../../api/errors";
import type { OpenOrganizerResult } from "../../utilities/organizer/openOrganizerTournament";
import { removeTournamentCaches } from "../../utilities/organizer/tournamentQueryCache";
import { tournamentQueryKeys } from "../../utilities/organizer/tournamentQueryKeys";
import { fetchTournamentList } from "../../utilities/organizer/tournamentQueries";

import {
  useTournamentListModals,
  type ConfirmTournamentActionResult
} from "./useTournamentListModals";

export type { ConfirmTournamentActionResult };

export interface UseTournamentListParams {
  authReady: boolean;
  authToken: string | null;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  clearEmailVerifyRequired: () => void;
  openTournament: (tournamentId: string, editMode?: boolean) => Promise<OpenOrganizerResult | void>;
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
  const queryClient = useQueryClient();
  const modals = useTournamentListModals();
  const [suggestedPlayerNames, setSuggestedPlayerNames] = useState<string[]>([]);

  const listQuery = useQuery({
    queryKey: tournamentQueryKeys.list(),
    queryFn: fetchTournamentList,
    enabled: authReady && Boolean(authToken)
  });

  const deleteMutation = useMutation({
    mutationFn: (tournamentId: string) =>
      apiDelete<{ ok: boolean }>(`/tournaments/${tournamentId}`),
    onSuccess: (_data, tournamentId) => {
      removeTournamentCaches(queryClient, tournamentId);
      onTournamentDeleted(tournamentId);
    }
  });

  useEffect(() => {
    if (!listQuery.isSuccess) return;
    clearEmailVerifyRequired();
    void apiGet<{ names: string[] }>("/players/suggestions")
      .then((response) => setSuggestedPlayerNames(response.names ?? []))
      .catch(() => undefined);
  }, [listQuery.isSuccess, listQuery.dataUpdatedAt, clearEmailVerifyRequired]);

  useEffect(() => {
    if (!listQuery.error) return;
    if (isEmailVerifyRequired(listQuery.error)) {
      markEmailVerifyRequired(listQuery.error.verifyBy);
      return;
    }
    setErrorText((listQuery.error as Error).message);
  }, [listQuery.error, markEmailVerifyRequired, setErrorText]);

  const confirmTournamentAction = async (): Promise<ConfirmTournamentActionResult | null> => {
    const tournamentId = modals.selectedTournamentId;
    const action = modals.pendingTournamentAction;
    if (!tournamentId || !action) {
      modals.clearActionSelection();
      return null;
    }
    try {
      setErrorText("");
      if (action === "DELETE") {
        await deleteMutation.mutateAsync(tournamentId);
        return { action: "DELETE", tournamentId };
      }
      return { action: "EDIT", tournamentId, openResult: await openTournament(tournamentId, true) };
    } catch (error) {
      setErrorText((error as Error).message);
      return null;
    } finally {
      modals.clearActionSelection();
    }
  };

  return {
    tournaments: listQuery.data ?? [],
    suggestedPlayerNames,
    listRefreshing: listQuery.isFetching,
    loadTournaments: async () => {
      setErrorText("");
      await listQuery.refetch();
    },
    openTournamentOptions: modals.openTournamentOptions,
    requestTournamentAction: modals.requestTournamentAction,
    confirmTournamentAction,
    showTournamentOptionsModal: modals.showTournamentOptionsModal,
    setShowTournamentOptionsModal: modals.setShowTournamentOptionsModal,
    showTournamentActionConfirmModal: modals.showTournamentActionConfirmModal,
    setShowTournamentActionConfirmModal: modals.setShowTournamentActionConfirmModal,
    pendingTournamentAction: modals.pendingTournamentAction
  };
}
