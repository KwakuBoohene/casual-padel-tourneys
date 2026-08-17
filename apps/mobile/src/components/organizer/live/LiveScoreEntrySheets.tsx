import { AlertSheet, ScoreEntrySheet } from "../../sheets";
import type {
  LiveTournamentActions,
  LiveTournamentScoreState,
  LiveTournamentSessionState
} from "../../../types/organizer/liveTournamentView";
import { useRegularWinMethodPrompt } from "../../../hooks/organizer/score/useRegularWinMethodPrompt";
import { formatTournamentMode } from "../../../utilities/organizer/formatLabels";
import { isRegularTournament } from "../../../utilities/organizer/regularScoreEntry";
import { RegularWinMethodSheet } from "./RegularWinMethodSheet";

interface LiveScoreEntrySheetsProps {
  session: LiveTournamentSessionState;
  score: LiveTournamentScoreState;
  actions: LiveTournamentActions;
}

export function LiveScoreEntrySheets({ session, score, actions }: LiveScoreEntrySheetsProps) {
  const matchId = score.scoreEntry?.matchId;
  const match = matchId
    ? session.tournament.rounds.flatMap((round) => round.matches).find((item) => item.id === matchId)
    : undefined;
  const nameOf = (id: string) => session.playerNameById.get(id) ?? id;
  const teamALabel = match ? `${nameOf(match.teamA[0])} / ${nameOf(match.teamA[1])}` : "Team A";
  const teamBLabel = match ? `${nameOf(match.teamB[0])} / ${nameOf(match.teamB[1])}` : "Team B";
  const modeLabel = formatTournamentMode(session.tournament.config.mode);
  const points = session.tournament.config.pointsPerMatch;
  const regular = isRegularTournament(session.tournament);
  const contextLine =
    score.scoreEntryContextLine ??
    (regular ? "Regular scoring · Set 1 · games" : `${modeLabel} scoring · to ${points} points`);
  const canComplete = Boolean(score.scoreEntryCanComplete);
  const winMethods = useRegularWinMethodPrompt({
    regularConfig: session.tournament.config.regularScoring ?? null,
    sets: score.scoreEntry?.sets ?? [],
    canComplete,
    onComplete: (sets) => actions.onSaveScoreEntry(sets),
    onSaveWithoutPrompt: () => actions.onSaveScoreEntry()
  });

  return (
    <>
      <ScoreEntrySheet
        visible={Boolean(score.scoreEntry)}
        title={match ? `Court ${match.court}` : "Score"}
        contextLine={contextLine}
        teamALabel={teamALabel}
        teamBLabel={teamBLabel}
        scoreA={score.scoreEntry?.scoreA ?? null}
        scoreB={score.scoreEntry?.scoreB ?? null}
        canUndo={Boolean(score.scoreEntry && score.scoreEntry.undoStack.length > 0)}
        saveDisabled={score.savingScore}
        saveLabel={regular ? (canComplete ? "Complete match" : "Save draft") : "Save"}
        secondarySaveLabel={regular && canComplete ? "Save draft" : undefined}
        plusDisabledA={score.scoreEntryPlusDisabledA}
        plusDisabledB={score.scoreEntryPlusDisabledB}
        max={regular ? 99 : points}
        onChangeScoreA={actions.onChangeScoreA}
        onChangeScoreB={actions.onChangeScoreB}
        onUndo={actions.onUndoScoreEntry}
        onSave={winMethods.requestSave}
        onSecondarySave={
          actions.onSaveScoreDraft
            ? () => {
                void actions.onSaveScoreDraft?.();
              }
            : undefined
        }
        onDismiss={actions.onCloseScoreEntry}
      />
      <RegularWinMethodSheet
        visible={winMethods.visible && Boolean(score.scoreEntry)}
        teamALabel={teamALabel}
        teamBLabel={teamBLabel}
        sets={winMethods.draftSets}
        saving={score.savingScore}
        onChangeMethod={winMethods.changeMethod}
        onConfirm={winMethods.confirm}
        onDismiss={winMethods.dismiss}
      />
      <AlertSheet
        visible={Boolean(score.pendingCompletedEditMatchId)}
        variant="warning"
        title="Edit completed score?"
        message="This match is already saved. Changing it updates the leaderboard."
        primaryAction={{ label: "Edit score", onPress: actions.onConfirmEditCompletedScore }}
        secondaryAction={{ label: "Cancel", onPress: actions.onCancelEditCompletedScore }}
        onDismiss={actions.onCancelEditCompletedScore}
      />
      <AlertSheet
        visible={Boolean(score.scoreSheetError)}
        variant="error"
        title="Cannot save score"
        message={score.scoreSheetError || "Please try again."}
        primaryAction={{
          label: score.scoreEntry ? "Retry" : "OK",
          onPress: () => {
            if (score.scoreEntry) winMethods.requestSave();
            else actions.onClearScoreSheetError();
          }
        }}
        secondaryAction={
          score.scoreEntry ? { label: "Dismiss", onPress: actions.onClearScoreSheetError } : undefined
        }
        onDismiss={actions.onClearScoreSheetError}
      />
    </>
  );
}
