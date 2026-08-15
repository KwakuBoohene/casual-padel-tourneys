import { useState } from "react";

import { getKohHub } from "../../api/koh";
import { isEmailVerifyRequired } from "../../api/errors";
import type { KohTournamentHub } from "../../types/koh/create";

export interface UseKohLiveSessionParams {
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}

export function useKohLiveSession(params: UseKohLiveSessionParams) {
  const [kohHub, setKohHub] = useState<KohTournamentHub | null>(null);

  const adoptKohHub = (hub: KohTournamentHub) => {
    setKohHub(hub);
  };

  const openKohTournament = async (tournamentId: string) => {
    try {
      params.setErrorText("");
      const hub = await getKohHub(tournamentId);
      setKohHub(hub);
      return hub;
    } catch (error) {
      if (isEmailVerifyRequired(error)) {
        params.markEmailVerifyRequired(error.verifyBy);
        return null;
      }
      params.setErrorText((error as Error).message);
      return null;
    }
  };

  const clearKohHub = () => setKohHub(null);

  return { kohHub, adoptKohHub, openKohTournament, clearKohHub, setKohHub };
}
