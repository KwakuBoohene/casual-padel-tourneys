import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { OrganizerManagedPlayer, OrganizerPlayerStatus } from "@padel/shared";

import {
  archiveAccountPlayer,
  listManagedPlayers,
  unarchiveAccountPlayer
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
  const [pending, setPending] = useState<OrganizerManagedPlayer | null>(null);

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
    if (!pending) return;
    try {
      await archiveAccountPlayer(pending.id);
      setPending(null);
      await afterChange();
    } catch (error) {
      if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
      else setErrorText((error as Error).message);
    }
  };

  const confirmUnarchive = async () => {
    if (!pending) return;
    try {
      await unarchiveAccountPlayer(pending.id);
      setPending(null);
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
    reload,
    confirmArchive,
    confirmUnarchive
  };
}
