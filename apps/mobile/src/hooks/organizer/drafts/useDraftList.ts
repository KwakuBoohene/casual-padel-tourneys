import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { TournamentDraftSummary } from "@padel/shared";

import { deleteDraft, listDrafts } from "../../../api/drafts";
import { draftQueryKeys } from "../../../utilities/organizer/draftQueryKeys";

/**
 * Drafts for the tournament list. Errors (e.g. guests, unverified email) quietly show no drafts:
 * the tournament list already surfaces those states.
 */
export function useDraftList(enabled: boolean) {
  const queryClient = useQueryClient();
  const [optionsFor, setOptionsFor] = useState<TournamentDraftSummary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const query = useQuery({
    queryKey: draftQueryKeys.list(),
    queryFn: listDrafts,
    enabled,
    retry: false
  });

  const removal = useMutation({
    mutationFn: (id: string) => deleteDraft(id),
    onSuccess: () => {
      setConfirmDelete(false);
      setOptionsFor(null);
      void queryClient.invalidateQueries({ queryKey: draftQueryKeys.all });
    }
  });

  const drafts = query.data ?? [];
  return {
    own: drafts.filter((draft) => draft.role !== "EDITOR"),
    shared: drafts.filter((draft) => draft.role === "EDITOR"),
    refresh: () => query.refetch(),
    options: {
      draft: optionsFor,
      confirming: confirmDelete,
      deleting: removal.isPending,
      deleteError: removal.error ? (removal.error as Error).message : null,
      open: (draft: TournamentDraftSummary) => setOptionsFor(draft),
      close: () => {
        setOptionsFor(null);
        setConfirmDelete(false);
        removal.reset();
      },
      requestDelete: () => setConfirmDelete(true),
      cancelDelete: () => setConfirmDelete(false),
      confirmDelete: () => optionsFor && removal.mutate(optionsFor.id)
    }
  };
}

export type DraftListController = ReturnType<typeof useDraftList>;
