import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { OrganizerManagedPlayer, OrganizerPlayerStatus } from "@padel/shared";

import {
  archiveAccountPlayers,
  listManagedPlayers,
  renameAccountPlayer,
  unarchiveAccountPlayers
} from "../../api/accountPlayers";
import { isEmailVerifyRequired } from "../../api/errors";
import { tournamentQueryKeys } from "../../utilities/organizer/tournamentQueryKeys";

export function usePlayerManagement(params: {
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}) {
  const queryClient = useQueryClient();
  const { setErrorText, markEmailVerifyRequired } = params;
  const [status, setStatus] = useState<OrganizerPlayerStatus>("active");
  const [players, setPlayers] = useState<OrganizerManagedPlayer[]>([]);
  const [guestMessage, setGuestMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<OrganizerManagedPlayer[]>([]);
  const [renaming, setRenaming] = useState<OrganizerManagedPlayer | null>(null);

  const reportError = useCallback(
    (error: unknown) =>
      isEmailVerifyRequired(error) ? markEmailVerifyRequired(error.verifyBy) : setErrorText((error as Error).message),
    [setErrorText, markEmailVerifyRequired]
  );

  /** Fetches the list; results are applied only while `isCurrent()` holds, so stale responses are dropped. */
  const load = useCallback(
    (isCurrent: () => boolean) => {
      setErrorText("");
      return listManagedPlayers(status)
        .then(
          (data) => {
            if (!isCurrent()) return;
            setGuestMessage(data.guest ? (data.message ?? "Attach an account to manage players.") : null);
            setPlayers(data.guest ? [] : data.players);
          },
          (error: unknown) => isCurrent() && reportError(error)
        )
        .finally(() => isCurrent() && setLoading(false));
    },
    [status, setErrorText, reportError]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    await load(() => true);
  }, [load]);

  // Switching lists shows the loading state immediately, before the fetch effect runs.
  const [requestedStatus, setRequestedStatus] = useState<OrganizerPlayerStatus | null>(null);
  if (requestedStatus !== status) {
    setRequestedStatus(status);
    setLoading(true);
  }

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const afterChange = async () => {
    await queryClient.invalidateQueries({ queryKey: tournamentQueryKeys.playerSuggestions() });
    await reload();
  };

  /** Applies an archive/unarchive to the players awaiting confirmation; resolves to whether it succeeded. */
  const confirmPending = async (change: (playerIds: string[]) => Promise<unknown>) => {
    if (pending.length === 0) return false;
    try {
      await change(pending.map((player) => player.id));
      setPending([]);
      await afterChange();
      return true;
    } catch (error) {
      reportError(error);
      return false;
    }
  };
  const confirmArchive = () => confirmPending(archiveAccountPlayers);
  const confirmUnarchive = () => confirmPending(unarchiveAccountPlayers);

  const confirmRename = async (name: string) => {
    if (!renaming) return;
    try {
      await renameAccountPlayer(renaming.id, name);
      setRenaming(null);
      await afterChange();
    } catch (error) {
      reportError(error);
    }
  };

  return {
    status,
    setStatus,
    players,
    guestMessage,
    loading,
    pending,
    setPending,
    renaming,
    setRenaming,
    reload,
    confirmArchive,
    confirmUnarchive,
    confirmRename
  };
}
