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

  /** Fetches the board; results are applied only while `isCurrent()` holds, so stale responses are dropped. */
  const load = useCallback(
    (isCurrent: () => boolean) => {
      setErrorText("");
      return getKohRankings(tournamentId, scope === "court" ? courtNumber : undefined)
        .then(
          (data) => {
            if (isCurrent()) setBoard(data);
          },
          (error: unknown) => {
            if (!isCurrent()) return;
            if (isEmailVerifyRequired(error)) {
              markEmailVerifyRequired(error.verifyBy);
            } else {
              setErrorText((error as Error).message);
            }
          }
        )
        .finally(() => {
          if (isCurrent()) setLoading(false);
        });
    },
    [tournamentId, courtNumber, scope, setErrorText, markEmailVerifyRequired]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    await load(() => true);
  }, [load]);

  // Changing court or scope shows the loading state immediately, before the fetch effect runs.
  const requestKey = `${tournamentId}:${courtNumber}:${scope}`;
  const [requestedKey, setRequestedKey] = useState<string | null>(null);
  if (requestedKey !== requestKey) {
    setRequestedKey(requestKey);
    setLoading(true);
  }

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

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
