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
  const { tournamentId, courtNumber, setErrorText, markEmailVerifyRequired } = params;
  const [scope, setScope] = useState<"court" | "all">("court");
  const [board, setBoard] = useState<KohRankingsBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setErrorText("");
      const data = await getKohRankings(tournamentId, scope === "court" ? courtNumber : undefined);
      setBoard(data);
    } catch (error) {
      if (isEmailVerifyRequired(error)) {
        markEmailVerifyRequired(error.verifyBy);
      } else {
        setErrorText((error as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [tournamentId, courtNumber, scope, setErrorText, markEmailVerifyRequired]);

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
