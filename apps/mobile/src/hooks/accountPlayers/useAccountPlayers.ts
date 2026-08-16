import { useCallback, useEffect, useState } from "react";
import type {
  OrganizerPlayerDetail,
  OrganizerPlayerLeaderboard,
  OrganizerPlayerRange
} from "@padel/shared";

import { getAccountPlayerDetail, getAccountPlayerLeaderboard } from "../../api/accountPlayers";
import { isEmailVerifyRequired } from "../../api/errors";

export function useAccountPlayers(params: {
  isGuest: boolean;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}) {
  const { setErrorText, markEmailVerifyRequired } = params;
  const [range, setRange] = useState<OrganizerPlayerRange>("year");
  const [board, setBoard] = useState<OrganizerPlayerLeaderboard | null>(null);
  const [guestMessage, setGuestMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrganizerPlayerDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const reloadBoard = useCallback(async () => {
    setLoading(true);
    try {
      setErrorText("");
      const data = await getAccountPlayerLeaderboard(range);
      if (data.guest) {
        setGuestMessage(data.message ?? "Attach an account to track careers.");
        setBoard({ range, rows: [] });
      } else {
        setGuestMessage(null);
        setBoard(data);
      }
    } catch (error) {
      if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
      else setErrorText((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [range, setErrorText, markEmailVerifyRequired]);

  useEffect(() => {
    void reloadBoard();
  }, [reloadBoard]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        setErrorText("");
        const next = await getAccountPlayerDetail(selectedId, range);
        if (!cancelled) setDetail(next);
      } catch (error) {
        if (cancelled) return;
        if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
        else setErrorText((error as Error).message);
        setSelectedId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, range, setErrorText, markEmailVerifyRequired]);

  return {
    range,
    setRange,
    board,
    guestMessage,
    selectedId,
    detail,
    loading,
    openDetail: setSelectedId,
    closeDetail: () => {
      setSelectedId(null);
      setDetail(null);
    },
    reloadBoard
  };
}
