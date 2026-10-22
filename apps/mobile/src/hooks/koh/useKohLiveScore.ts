import { useState } from "react";

import type { useSubmission } from "../useSubmission";
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
  submission: ReturnType<typeof useSubmission>;
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
  const { saving, run, isPending } = params.submission;

  const saveScore = (status: "DRAFT" | "COMPLETE") =>
    run(async () => {
      if (!params.courtId) return;
      const hub = await runKohScoreSave({
        hub: params.hub,
        courtId: params.courtId,
        draft: scoreDraft,
        status,
        matchId: params.matchId,
        setErrorText: params.setErrorText,
        markEmailVerifyRequired: params.markEmailVerifyRequired
      });
      if (hub) {
        setScoreOpen(false);
        setMethodsOpen(false);
        params.onSaved(hub);
      }
    });

  return {
    scoreOpen,
    methodsOpen,
    scoreDraft,
    saving,
    scoreUiOpen: scoreOpen || methodsOpen,
    canComplete: kohScoreCanComplete(scoreDraft, params.hub.config.regularScoring),
    openScore: () => {
      if (isPending()) return;
      setScoreDraft(emptyKohScoreDraft());
      setScoreOpen(true);
    },
    closeScore: () => {
      if (isPending()) return;
      setScoreOpen(false);
      setMethodsOpen(false);
    },
    changeGames: (side: "A" | "B", next: number) => {
      if (!isPending()) setScoreDraft((prev) => changeKohGames(prev, side, next));
    },
    undoGames: () => {
      if (!isPending()) setScoreDraft((prev) => undoKohGames(prev));
    },
    requestComplete: () => {
      if (isPending()) return;
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
      if (isPending()) return;
      setScoreDraft((prev) => {
        const key = side === "A" ? "winMethodsA" : "winMethodsB";
        const methods = [...prev[key]];
        methods[index] = method;
        return { ...prev, [key]: methods };
      });
    }
  };
}
