import { useState, type Dispatch, type SetStateAction } from "react";

import type { LiveTournamentState } from "../types";

import { findMatchInTournament } from "./scoreDraftActions";
import {
  initialScorePair,
  persistScoreEntry,
  validateAmericanoScores,
  type ScoreEntryState
} from "./scoreEntryHelpers";
import type { ScoreDraftMap } from "./useScoreDraftPersistence";

export type { ScoreEntryState } from "./scoreEntryHelpers";

export function useScoreEntry(params: {
  liveTournament: LiveTournamentState | null;
  scoreInputs: ScoreDraftMap;
  setScoreInputs: Dispatch<SetStateAction<ScoreDraftMap>>;
  onTournamentUpdated: (data: LiveTournamentState) => void;
  setErrorText: (value: string) => void;
}) {
  const { liveTournament, scoreInputs, setScoreInputs, onTournamentUpdated, setErrorText } = params;
  const [scoreEntry, setScoreEntry] = useState<ScoreEntryState | null>(null);
  const [pendingCompletedEditMatchId, setPendingCompletedEditMatchId] = useState<string | null>(null);
  const [scoreSheetError, setScoreSheetError] = useState<string | null>(null);
  const [savingScore, setSavingScore] = useState(false);

  const openEntry = (matchId: string) => {
    if (!liveTournament) return;
    setScoreSheetError(null);
    setScoreEntry({ matchId, ...initialScorePair(liveTournament, matchId, scoreInputs), undoStack: [] });
  };

  const requestOpenScoreEntry = (matchId: string) => {
    if (!liveTournament) return;
    if (findMatchInTournament(liveTournament, matchId)?.completed) {
      setPendingCompletedEditMatchId(matchId);
      return;
    }
    openEntry(matchId);
  };

  const pushChange = (scoreA: number, scoreB: number) => {
    setScoreEntry((prev) =>
      prev
        ? {
            ...prev,
            undoStack: [...prev.undoStack, { scoreA: prev.scoreA, scoreB: prev.scoreB }],
            scoreA,
            scoreB
          }
        : prev
    );
  };

  const clamp = (value: number) =>
    Math.max(0, Math.min(liveTournament?.config.pointsPerMatch ?? 0, value));

  const saveScoreEntry = async () => {
    if (!liveTournament || !scoreEntry) return;
    const invalid = validateAmericanoScores(
      scoreEntry.scoreA,
      scoreEntry.scoreB,
      liveTournament.config.pointsPerMatch
    );
    if (invalid) {
      setScoreSheetError(invalid);
      return;
    }
    setSavingScore(true);
    setScoreSheetError(null);
    setErrorText("");
    try {
      await persistScoreEntry({
        tournament: liveTournament,
        matchId: scoreEntry.matchId,
        scoreA: scoreEntry.scoreA,
        scoreB: scoreEntry.scoreB,
        onTournamentUpdated,
        setScoreInputs
      });
      setScoreEntry(null);
    } catch (error) {
      setScoreSheetError((error as Error).message);
    } finally {
      setSavingScore(false);
    }
  };

  return {
    scoreEntry,
    requestOpenScoreEntry,
    closeScoreEntry: () => {
      setScoreEntry(null);
      setScoreSheetError(null);
    },
    changeScoreA: (next: number) => scoreEntry && pushChange(clamp(next), scoreEntry.scoreB),
    changeScoreB: (next: number) => scoreEntry && pushChange(scoreEntry.scoreA, clamp(next)),
    undoScoreEntry: () =>
      setScoreEntry((prev) => {
        if (!prev?.undoStack.length) return prev;
        const undoStack = [...prev.undoStack];
        return { ...prev, ...undoStack.pop()!, undoStack };
      }),
    saveScoreEntry,
    savingScore,
    pendingCompletedEditMatchId,
    confirmEditCompletedScore: () => {
      if (!pendingCompletedEditMatchId) return;
      const id = pendingCompletedEditMatchId;
      setPendingCompletedEditMatchId(null);
      openEntry(id);
    },
    cancelEditCompletedScore: () => setPendingCompletedEditMatchId(null),
    scoreSheetError,
    clearScoreSheetError: () => setScoreSheetError(null)
  };
}
