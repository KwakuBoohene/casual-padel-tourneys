import { useEffect, useState } from "react";
import type { KohCourtChange } from "@padel/shared";

import type { KohTournamentHub } from "../../types/koh/create";
import {
  queueCourtChange,
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

export function useKohLive(params: UseKohLiveParams) {
  const [courtIndex, setCourtIndex] = useState(0);
  const [swapOpen, setSwapOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingCourtChange, setPendingCourtChange] = useState<KohCourtChange | null>(null);
  const [queuedCourtChange, setQueuedCourtChange] = useState<KohCourtChange | null>(null);
  const court = params.hub.courts[courtIndex] ?? params.hub.courts[0];

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
    setErrorText: params.setErrorText,
    markEmailVerifyRequired: params.markEmailVerifyRequired,
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
    infoTitle,
    infoMessage,
    applySwap: async (input: {
      slot: "KING" | "CHALLENGER";
      withUnitId: string;
      reason: string;
      permanent?: boolean;
    }) => {
      if (!court) return;
      setSaving(true);
      const hub = await runKohSwap({
        hub: params.hub,
        courtId: court.id,
        ...input,
        setErrorText: params.setErrorText,
        markEmailVerifyRequired: params.markEmailVerifyRequired
      });
      setSaving(false);
      if (hub) {
        setSwapOpen(false);
        applyHub(hub, score.scoreUiOpen);
      }
    },
    applyPromotePick: async (demotedUnitId: string) => {
      setSaving(true);
      const hub = await runKohPromotePick({
        hub: params.hub,
        demotedUnitId,
        setErrorText: params.setErrorText,
        markEmailVerifyRequired: params.markEmailVerifyRequired
      });
      setSaving(false);
      if (hub) applyHub(hub, score.scoreUiOpen);
    },
    dismissCourtChange: () => setPendingCourtChange(null),
    showInfo: (title: string, message: string) => {
      setInfoTitle(title);
      setInfoMessage(message);
    },
    dismissInfo: () => setInfoTitle(null)
  };
}
