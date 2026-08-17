import { useState } from "react";
import type { KohGameWinMethod, MatchSet, RegularScoringConfig } from "@padel/shared";

import { currentSetIndex } from "../../../utilities/organizer/regularScoreEntry";
import { needsWinMethodPrompt, padSetWinMethods, setGameWinMethod } from "../../../utilities/organizer/regularWinMethods";

export function useRegularWinMethodPrompt(params: {
  regularConfig: RegularScoringConfig | null;
  sets: MatchSet[];
  setComplete: boolean;
  matchComplete: boolean;
  onComplete: (sets: MatchSet[]) => void;
  onNextSet: (sets: MatchSet[]) => void;
  onSaveDraft: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [draftSets, setDraftSets] = useState<MatchSet[]>([]);
  const prompt = needsWinMethodPrompt(params.regularConfig);
  const setIndex = params.regularConfig ? currentSetIndex(draftSets.length > 0 ? draftSets : params.sets, params.regularConfig) : 0;

  const requestPrimary = () => {
    if (!params.setComplete) {
      params.onSaveDraft();
      return;
    }
    if (prompt) {
      const padded = params.sets.map((set, index) =>
        index === currentSetIndex(params.sets, params.regularConfig!) ? padSetWinMethods(set) : set
      );
      setDraftSets(padded);
      setVisible(true);
      return;
    }
    if (params.matchComplete) params.onComplete(params.sets);
    else params.onNextSet(params.sets);
  };

  const changeMethod = (
    nextSetIndex: number,
    side: "A" | "B",
    gameIndex: number,
    method: KohGameWinMethod
  ) => {
    setDraftSets((prev) => setGameWinMethod(prev, nextSetIndex, side, gameIndex, method));
  };

  const confirm = () => {
    setVisible(false);
    if (params.matchComplete) params.onComplete(draftSets);
    else params.onNextSet(draftSets);
  };

  return {
    visible,
    draftSets,
    setIndex,
    confirmLabel: params.matchComplete ? "Complete match" : "Next set",
    requestPrimary,
    changeMethod,
    confirm,
    dismiss: () => setVisible(false)
  };
}
