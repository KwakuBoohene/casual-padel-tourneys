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

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setErrorText("");
      const data = await listManagedPlayers(status);
      if (data.guest) {
        setGuestMessage(data.message ?? "Attach an account to manage players.");
        setPlayers([]);
      } else {
        setGuestMessage(null);
        setPlayers(data.players);
      }
    } catch (error) {
      if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
      else setErrorText((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, setErrorText, markEmailVerifyRequired]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const afterChange = async () => {
    await queryClient.invalidateQueries({ queryKey: tournamentQueryKeys.playerSuggestions() });
    await reload();
  };

  const confirmArchive = async () => {
    if (pending.length === 0) return false;
    try {
      await archiveAccountPlayers(pending.map((player) => player.id));
      setPending([]);
      await afterChange();
      return true;
    } catch (error) {
      if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
      else setErrorText((error as Error).message);
      return false;
    }
  };

  const confirmUnarchive = async () => {
    if (pending.length === 0) return false;
    try {
      await unarchiveAccountPlayers(pending.map((player) => player.id));
      setPending([]);
      await afterChange();
      return true;
    } catch (error) {
      if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
      else setErrorText((error as Error).message);
      return false;
    }
  };

  const confirmRename = async (name: string) => {
    if (!renaming) return;
    try {
      await renameAccountPlayer(renaming.id, name);
      setRenaming(null);
      await afterChange();
    } catch (error) {
      if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
      else setErrorText((error as Error).message);
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
