import { useCallback, useEffect, useState } from "react";
import type { KohRankingsBoard } from "@padel/shared";

import { getKohRankings } from "../../api/koh";
import { isEmailVerifyRequired } from "../../api/errors";

export function useKohRankings(params: {
  tournamentId: string;
  courtNumber: number;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}) {
  const [scope, setScope] = useState<"court" | "all">("court");
  const [board, setBoard] = useState<KohRankingsBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      params.setErrorText("");
      const data = await getKohRankings(
        params.tournamentId,
        scope === "court" ? params.courtNumber : undefined
      );
      setBoard(data);
    } catch (error) {
      if (isEmailVerifyRequired(error)) {
        params.markEmailVerifyRequired(error.verifyBy);
      } else {
        params.setErrorText((error as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [params.tournamentId, params.courtNumber, scope]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    scope,
    setScope,
    board,
    loading,
    helpOpen,
    setHelpOpen,
    reload
  };
}
