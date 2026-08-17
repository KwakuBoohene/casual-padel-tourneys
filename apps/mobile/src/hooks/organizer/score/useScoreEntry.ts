import { useState, type Dispatch, type SetStateAction } from "react";
import type { MatchSet } from "@padel/shared";

import type { LiveTournamentState } from "../../../types/organizer/tournament";
import { findMatchInTournament } from "../../../utilities/organizer/scoreDraftActions";
import { initialScorePair, type ScoreEntryState } from "../../../utilities/organizer/scoreEntryHelpers";
import {
  advanceToNextRegularSet,
  buildScoreEntryFromPair,
  changeScoreEntrySide,
  restoreScoreEntryUndo
} from "../../../utilities/organizer/scoreEntryTransitions";
import { runOpenScoreSave } from "../../../utilities/organizer/scoreSaveFlows";
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

  const openEntry = (matchId: string) => {
    if (!liveTournament) return;
    setScoreSheetError(null);
    setScoreEntry(
      buildScoreEntryFromPair(liveTournament, matchId, initialScorePair(liveTournament, matchId, scoreInputs))
    );
  };

  const runSave = async (complete: boolean, sets?: MatchSet[]) => {
    if (!liveTournament || !scoreEntry) return;
    setSavingScore(true);
    setScoreSheetError(null);
    setErrorText("");
    try {
      const error = await runOpenScoreSave({
        tournament: liveTournament,
        entry: { ...scoreEntry, sets: sets ?? scoreEntry.sets },
        complete,
        points,
        regular: meta.regular,
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

  return {
    scoreEntry,
    scoreEntryContextLine: meta.contextLine,
    scoreEntryCanComplete: meta.canComplete,
    scoreEntrySetComplete: meta.setComplete,
    scoreEntryPrimaryAction: meta.primaryAction,
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
      setScoreEntry(changeScoreEntrySide(scoreEntry, liveTournament, "A", next, points));
    },
    changeScoreB: (next: number) => {
      if (!scoreEntry || !liveTournament) return;
      setScoreEntry(changeScoreEntrySide(scoreEntry, liveTournament, "B", next, points));
    },
    undoScoreEntry: () =>
      setScoreEntry((prev) =>
        prev && liveTournament ? (restoreScoreEntryUndo(prev, liveTournament) ?? prev) : prev
      ),
    saveScoreEntry: (sets?: MatchSet[]) => void runSave(meta.regular ? meta.canComplete : true, sets),
    saveScoreDraft: () => void runSave(false),
    advanceRegularSet: (sets?: MatchSet[]) => {
      if (!scoreEntry || !liveTournament) return;
      const next = advanceToNextRegularSet(scoreEntry, liveTournament, sets);
      if (next) setScoreEntry(next);
    },
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
