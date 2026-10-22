import { getSelectedOrganizer } from "../../api/organizerContext";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { isEmailVerifyRequired } from "../../api/errors";
import type { OpenOrganizerResult } from "../../utilities/organizer/openOrganizerTournament";
import { tournamentQueryKeys } from "../../utilities/organizer/tournamentQueryKeys";
import { fetchTournamentList } from "../../utilities/organizer/tournamentQueries";

import { usePlayerNameSuggestions } from "./usePlayerNameSuggestions";
import { useSubmission } from "../useSubmission";

import { useTournamentDelete } from "./useTournamentDelete";
import { useTournamentListModals, type ConfirmTournamentActionResult } from "./useTournamentListModals";

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
  const { saving: tournamentActionSaving, run, isPending } = useSubmission();
  const modals = useTournamentListModals();
  const suggestedPlayerNames = usePlayerNameSuggestions(authReady && Boolean(authToken));
  const deleteMutation = useTournamentDelete(onTournamentDeleted);
  const listQuery = useQuery({
    queryKey: tournamentQueryKeys.list(),
    queryFn: fetchTournamentList,
    enabled: authReady && Boolean(authToken)
  });

  useEffect(() => {
    if (!listQuery.isSuccess) return;
    clearEmailVerifyRequired();
  }, [listQuery.isSuccess, listQuery.dataUpdatedAt, clearEmailVerifyRequired]);

  useEffect(() => {
    if (!listQuery.error) return;
    if (isEmailVerifyRequired(listQuery.error)) {
      markEmailVerifyRequired(listQuery.error.verifyBy);
      return;
    }
    setErrorText((listQuery.error as Error).message);
  }, [listQuery.error, markEmailVerifyRequired, setErrorText]);

  const confirmTournamentAction = () =>
    run(async (): Promise<ConfirmTournamentActionResult | null> => {
      const tournamentId = modals.selectedTournamentId;
      const action = modals.pendingTournamentAction;
      if (!tournamentId || !action) {
        modals.clearActionSelection();
        return null;
      }
      let holdSelection = false;
      try {
        setErrorText("");
        if (action === "DELETE") {
          const row = (listQuery.data ?? []).find((item) => item.id === tournamentId);
          if (row?.config.contributeToCareerLeaderboard !== false) {
            modals.openCareerDelete();
            holdSelection = true;
            return null;
          }
          await deleteMutation.mutateAsync({ tournamentId, stripCareer: false });
          return { action: "DELETE", tournamentId };
        }
        return { action: "EDIT", tournamentId, openResult: await openTournament(tournamentId, true) };
      } catch (error) {
        holdSelection = true;
        setErrorText((error as Error).message);
        return null;
      } finally {
        if (!holdSelection) modals.clearActionSelection();
      }
    });

  const confirmCareerDelete = (stripCareer: boolean) =>
    run(async () => {
      const tournamentId = modals.selectedTournamentId;
      if (!tournamentId) return;
      try {
        setErrorText("");
        await deleteMutation.mutateAsync({ tournamentId, stripCareer });
        modals.clearActionSelection();
      } catch (error) {
        setErrorText((error as Error).message);
      }
    });

  return {
    tournaments: listQuery.data ?? [],
    suggestedPlayerNames,
    listRefreshing: listQuery.isFetching,
    loadTournaments: async () => {
      setErrorText("");
      await listQuery.refetch();
    },
    openTournamentOptions: modals.openTournamentOptions,
    requestTournamentAction: (action: "EDIT" | "DELETE") => {
      if (action === "DELETE" && getSelectedOrganizer()?.role === "MANAGER") {
        setErrorText("Only the owner can permanently delete a tournament.");
        return;
      }
      modals.requestTournamentAction(action);
    },
    confirmTournamentAction,
    confirmCareerDelete,
    tournamentActionSaving,
    cancelCareerDelete: () => {
      if (!isPending()) modals.clearActionSelection();
    },
    showTournamentOptionsModal: modals.showTournamentOptionsModal,
    setShowTournamentOptionsModal: modals.setShowTournamentOptionsModal,
    showTournamentActionConfirmModal: modals.showTournamentActionConfirmModal,
    setShowTournamentActionConfirmModal: (value: boolean) => {
      if (!isPending()) modals.setShowTournamentActionConfirmModal(value);
    },
    showCareerDeleteModal: modals.showCareerDeleteModal,
    pendingTournamentAction: modals.pendingTournamentAction
  };
}
