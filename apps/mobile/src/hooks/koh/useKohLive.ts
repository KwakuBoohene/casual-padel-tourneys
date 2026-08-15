import { useEffect, useState } from "react";
import type { KohCourtChange } from "@padel/shared";

import type { KohTournamentHub } from "../../types/koh/create";
import {
  queueCourtChange,
  runKohEnd,
  runKohPromotePick,
  runKohSwap
} from "../../utilities/koh/liveActions";

import { useKohLiveScore } from "./useKohLiveScore";
import { useKohTournamentSocket } from "./useKohTournamentSocket";

export interface UseKohLiveParams {
  hub: KohTournamentHub;
  setHub: (hub: KohTournamentHub) => void;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}

type SwapInput = {
  slot: "KING" | "CHALLENGER";
  withUnitId: string;
  reason: string;
  permanent?: boolean;
};

export function useKohLive(params: UseKohLiveParams) {
  const [courtIndex, setCourtIndex] = useState(0);
  const [swapOpen, setSwapOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingCourtChange, setPendingCourtChange] = useState<KohCourtChange | null>(null);
  const [queuedCourtChange, setQueuedCourtChange] = useState<KohCourtChange | null>(null);
  const court = params.hub.courts[courtIndex] ?? params.hub.courts[0];
  const err = {
    setErrorText: params.setErrorText,
    markEmailVerifyRequired: params.markEmailVerifyRequired
  };

  const applyHub = (hub: KohTournamentHub, scoreUiOpen: boolean) => {
    params.setHub(hub);
    const change = hub.lastCourtChange ?? null;
    if (change?.type === "PROMOTED") {
      queueCourtChange(change, scoreUiOpen, setPendingCourtChange, setQueuedCourtChange);
    }
  };

  const score = useKohLiveScore({
    hub: params.hub,
    courtId: court?.id,
    matchId: court?.activeMatch?.id,
    ...err,
    onSaved: (hub) => applyHub(hub, false)
  });

  useKohTournamentSocket({
    tournamentId: params.hub.id,
    publicToken: params.hub.publicToken,
    enabled: true,
    onHub: (hub) => applyHub(hub, score.scoreUiOpen)
  });

  useEffect(() => {
    if (!score.scoreUiOpen && queuedCourtChange) {
      setPendingCourtChange(queuedCourtChange);
      setQueuedCourtChange(null);
    }
  }, [score.scoreUiOpen, queuedCourtChange]);

  const runMut = async (
    fn: () => Promise<KohTournamentHub | null>,
    after?: (hub: KohTournamentHub) => void
  ) => {
    setSaving(true);
    const hub = await fn();
    setSaving(false);
    if (hub) {
      after?.(hub);
      applyHub(hub, score.scoreUiOpen);
    }
    return Boolean(hub);
  };

  return {
    ...score,
    courtIndex,
    setCourtIndex,
    court,
    canScore: Boolean(court?.king && court?.challenger),
    swapOpen,
    setSwapOpen,
    saving: saving || score.saving,
    pendingCourtChange,
    pendingPromote: params.hub.pendingPromote ?? null,
    applySwap: (input: SwapInput) =>
      court
        ? runMut(
            () => runKohSwap({ hub: params.hub, courtId: court.id, ...input, ...err }),
            () => setSwapOpen(false)
          )
        : Promise.resolve(false),
    applyPromotePick: (demotedUnitId: string) =>
      runMut(() => runKohPromotePick({ hub: params.hub, demotedUnitId, ...err })),
    endNight: () => runMut(() => runKohEnd({ hub: params.hub, ...err })),
    dismissCourtChange: () => setPendingCourtChange(null)
  };
}
