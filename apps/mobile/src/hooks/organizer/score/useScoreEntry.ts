import { useState, type Dispatch, type SetStateAction } from "react";

import type { LiveTournamentState } from "../../../types/organizer/tournament";
import { findMatchInTournament } from "../../../utilities/organizer/scoreDraftActions";
import { initialScorePair, type ScoreEntryState } from "../../../utilities/organizer/scoreEntryHelpers";
import {
  buildScoreEntryFromPair,
  changeRegularSide,
  nextScoreEntryAfterChange,
  restoreScoreEntryUndo
} from "../../../utilities/organizer/scoreEntryTransitions";
import { runAmericanoScoreSave, runRegularScoreSave } from "../../../utilities/organizer/scoreSaveFlows";
import type { ScoreDraftMap } from "./useScoreDraftPersistence";
import { useScoreEntryMeta } from "./useScoreEntryMeta";

export type { ScoreEntryState } from "../../../utilities/organizer/scoreEntryHelpers";

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
  const points = liveTournament?.config.pointsPerMatch ?? 0;
  const meta = useScoreEntryMeta(liveTournament, scoreEntry);
  const clamp = (value: number) => Math.max(0, Math.min(points, value));

  const openEntry = (matchId: string) => {
    if (!liveTournament) return;
    setScoreSheetError(null);
    setScoreEntry(
      buildScoreEntryFromPair(liveTournament, matchId, initialScorePair(liveTournament, matchId, scoreInputs))
    );
  };

  const runSave = async (complete: boolean) => {
    if (!liveTournament || !scoreEntry) return;
    setSavingScore(true);
    setScoreSheetError(null);
    setErrorText("");
    try {
      const error = meta.regular
        ? await runRegularScoreSave({ tournament: liveTournament, entry: scoreEntry, complete, onTournamentUpdated })
        : await runAmericanoScoreSave({
            tournament: liveTournament,
            entry: scoreEntry,
            points,
            onTournamentUpdated,
            setScoreInputs
          });
      if (error) setScoreSheetError(error);
      else setScoreEntry(null);
    } catch (error) {
      setScoreSheetError(error instanceof Error ? error.message : "Could not save score. Please try again.");
    } finally {
      setSavingScore(false);
    }
  };

  const applyAmericano = (scoreA: number, scoreB: number) => {
    if (!liveTournament) return;
    setScoreEntry((prev) =>
      prev ? nextScoreEntryAfterChange(prev, liveTournament, { scoreA, scoreB, sets: [] }) : prev
    );
  };

  return {
    scoreEntry,
    scoreEntryContextLine: meta.contextLine,
    scoreEntryCanComplete: meta.canComplete,
    scoreEntryPlusDisabledA: meta.plusDisabledA,
    scoreEntryPlusDisabledB: meta.plusDisabledB,
    requestOpenScoreEntry: (matchId: string) => {
      if (!liveTournament) return;
      if (findMatchInTournament(liveTournament, matchId)?.completed) {
        setPendingCompletedEditMatchId(matchId);
        return;
      }
      openEntry(matchId);
    },
    closeScoreEntry: () => {
      setScoreEntry(null);
      setScoreSheetError(null);
    },
    changeScoreA: (next: number) => {
      if (!scoreEntry || !liveTournament) return;
      const regularNext = changeRegularSide(scoreEntry, liveTournament, "A", next);
      if (regularNext) {
        setScoreEntry((prev) => (prev ? nextScoreEntryAfterChange(prev, liveTournament, regularNext) : prev));
        return;
      }
      const scoreA = clamp(next);
      applyAmericano(scoreA, clamp(points - scoreA));
    },
    changeScoreB: (next: number) => {
      if (!scoreEntry || !liveTournament) return;
      const regularNext = changeRegularSide(scoreEntry, liveTournament, "B", next);
      if (regularNext) {
        setScoreEntry((prev) => (prev ? nextScoreEntryAfterChange(prev, liveTournament, regularNext) : prev));
        return;
      }
      const scoreB = clamp(next);
      applyAmericano(clamp(points - scoreB), scoreB);
    },
    undoScoreEntry: () =>
      setScoreEntry((prev) =>
        prev && liveTournament ? (restoreScoreEntryUndo(prev, liveTournament) ?? prev) : prev
      ),
    saveScoreEntry: () => void runSave(meta.regular ? meta.canComplete : true),
    saveScoreDraft: () => void runSave(false),
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
