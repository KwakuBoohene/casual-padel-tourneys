import { useState } from "react";
import type { KohGameWinMethod } from "@padel/shared";

import type { KohTournamentHub } from "../../types/koh/create";
import {
  changeKohGames,
  emptyKohScoreDraft,
  kohScoreCanComplete,
  runKohScoreSave,
  syncWinMethodLengths,
  undoKohGames,
  type KohScoreDraft
} from "../../utilities/koh/liveActions";

export function useKohLiveScore(params: {
  hub: KohTournamentHub;
  courtId: string | undefined;
  matchId: string | undefined;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onSaved: (hub: KohTournamentHub) => void;
}) {
  const [scoreOpen, setScoreOpen] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [scoreDraft, setScoreDraft] = useState<KohScoreDraft>(emptyKohScoreDraft());
  const [saving, setSaving] = useState(false);

  const saveScore = async (status: "DRAFT" | "COMPLETE") => {
    if (!params.courtId) return;
    setSaving(true);
    const hub = await runKohScoreSave({
      hub: params.hub,
      courtId: params.courtId,
      draft: scoreDraft,
      status,
      matchId: params.matchId,
      setErrorText: params.setErrorText,
      markEmailVerifyRequired: params.markEmailVerifyRequired
    });
    setSaving(false);
    if (hub) {
      setScoreOpen(false);
      setMethodsOpen(false);
      params.onSaved(hub);
    }
  };

  return {
    scoreOpen,
    methodsOpen,
    scoreDraft,
    saving,
    scoreUiOpen: scoreOpen || methodsOpen,
    canComplete: kohScoreCanComplete(scoreDraft, params.hub.config.regularScoring),
    openScore: () => {
      setScoreDraft(emptyKohScoreDraft());
      setScoreOpen(true);
    },
    closeScore: () => {
      setScoreOpen(false);
      setMethodsOpen(false);
    },
    changeGames: (side: "A" | "B", next: number) =>
      setScoreDraft((prev) => changeKohGames(prev, side, next)),
    undoGames: () => setScoreDraft((prev) => undoKohGames(prev)),
    requestComplete: () => {
      if (!kohScoreCanComplete(scoreDraft, params.hub.config.regularScoring)) {
        params.setErrorText("Match is not complete yet.");
        return;
      }
      setScoreDraft((prev) => syncWinMethodLengths(prev));
      setScoreOpen(false);
      setMethodsOpen(true);
    },
    confirmMethods: () => void saveScore("COMPLETE"),
    saveDraft: () => void saveScore("DRAFT"),
    setMethod: (side: "A" | "B", index: number, method: KohGameWinMethod) => {
      setScoreDraft((prev) => {
        const key = side === "A" ? "winMethodsA" : "winMethodsB";
        const methods = [...prev[key]];
        methods[index] = method;
        return { ...prev, [key]: methods };
      });
    }
  };
}
