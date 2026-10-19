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
import type { useSubmission } from "../../useSubmission";

export type { ScoreEntryState } from "../../../utilities/organizer/scoreEntryHelpers";

export function useScoreEntry(params: {
  submission: ReturnType<typeof useSubmission>;
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
  const submission = params.submission;
  const { saving: savingScore, isPending } = submission;
  const points = liveTournament?.config.pointsPerMatch ?? 0;
  const meta = useScoreEntryMeta(liveTournament, scoreEntry);

  const openEntry = (matchId: string) => {
    if (!liveTournament || isPending()) return;
    setScoreSheetError(null);
    setScoreEntry(
      buildScoreEntryFromPair(liveTournament, matchId, initialScorePair(liveTournament, matchId, scoreInputs))
    );
  };

  const runSave = (complete: boolean, sets?: MatchSet[]) =>
    submission.run(async () => {
      if (!liveTournament || !scoreEntry) return;
      setScoreSheetError(null);
      setErrorText("");
      const submittedEntry = { ...scoreEntry, sets: sets ?? scoreEntry.sets };
      if (sets) setScoreEntry(submittedEntry);
      try {
        const error = await runOpenScoreSave({
          tournament: liveTournament,
          entry: submittedEntry,
          complete,
          points,
          regular: meta.regular,
          onTournamentUpdated,
          setScoreInputs
        });
        if (error) setScoreSheetError(error);
        else setScoreEntry(null);
      } catch (error) {
        setScoreSheetError(
          error instanceof Error ? error.message : "Could not save score. Please try again."
        );
      }
    });

  return {
    scoreEntry,
    scoreEntryContextLine: meta.contextLine,
    scoreEntryCanComplete: meta.canComplete,
    scoreEntrySetComplete: meta.setComplete,
    scoreEntryPrimaryAction: meta.primaryAction,
    scoreEntryPlusDisabledA: meta.plusDisabledA,
    scoreEntryPlusDisabledB: meta.plusDisabledB,
    requestOpenScoreEntry: (matchId: string) => {
      if (!liveTournament || isPending()) return;
      if (findMatchInTournament(liveTournament, matchId)?.completed) {
        setPendingCompletedEditMatchId(matchId);
        return;
      }
      openEntry(matchId);
    },
    closeScoreEntry: () => {
      if (isPending()) return;
      setScoreEntry(null);
      setScoreSheetError(null);
    },
    changeScoreA: (next: number) => {
      if (!scoreEntry || !liveTournament || isPending()) return;
      setScoreEntry(changeScoreEntrySide(scoreEntry, liveTournament, "A", next, points));
    },
    changeScoreB: (next: number) => {
      if (!scoreEntry || !liveTournament || isPending()) return;
      setScoreEntry(changeScoreEntrySide(scoreEntry, liveTournament, "B", next, points));
    },
    undoScoreEntry: () => {
      if (isPending()) return;
      setScoreEntry((prev) =>
        prev && liveTournament ? (restoreScoreEntryUndo(prev, liveTournament) ?? prev) : prev
      );
    },
    saveScoreEntry: (sets?: MatchSet[]) => void runSave(meta.regular ? meta.canComplete : true, sets),
    saveScoreDraft: () => void runSave(false),
    advanceRegularSet: (sets?: MatchSet[]) => {
      if (!scoreEntry || !liveTournament || isPending()) return;
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
