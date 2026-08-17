import { useState } from "react";
import type { KohGameWinMethod, MatchSet, RegularScoringConfig } from "@padel/shared";

import { needsWinMethodPrompt, padMatchWinMethods, setGameWinMethod } from "../../../utilities/organizer/regularWinMethods";

export function useRegularWinMethodPrompt(params: {
  regularConfig: RegularScoringConfig | null;
  sets: MatchSet[];
  canComplete: boolean;
  onComplete: (sets: MatchSet[]) => void;
  onSaveWithoutPrompt: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [draftSets, setDraftSets] = useState<MatchSet[]>([]);
  const prompt = needsWinMethodPrompt(params.regularConfig);

  const requestSave = () => {
    if (prompt && params.canComplete) {
      setDraftSets(padMatchWinMethods(params.sets));
      setVisible(true);
      return;
    }
    params.onSaveWithoutPrompt();
  };

  const changeMethod = (
    setIndex: number,
    side: "A" | "B",
    gameIndex: number,
    method: KohGameWinMethod
  ) => {
    setDraftSets((prev) => setGameWinMethod(prev, setIndex, side, gameIndex, method));
  };

  const confirm = () => {
    setVisible(false);
    params.onComplete(draftSets);
  };

  const dismiss = () => setVisible(false);

  return { visible, draftSets, requestSave, changeMethod, confirm, dismiss };
}
