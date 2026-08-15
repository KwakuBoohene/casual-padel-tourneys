import { AlertSheet, ScoreEntrySheet } from "../../sheets";
import { formatTournamentMode } from "../../../utilities/organizer/formatLabels";

import type { LiveTournamentViewProps } from "../../../types/organizer/liveTournamentView";

interface LiveScoreEntrySheetsProps {
  props: LiveTournamentViewProps;
}

export function LiveScoreEntrySheets({ props }: LiveScoreEntrySheetsProps) {
  const matchId = props.scoreEntry?.matchId;
  const match = matchId
    ? props.tournament.rounds.flatMap((round) => round.matches).find((item) => item.id === matchId)
    : undefined;
  const nameOf = (id: string) => props.playerNameById.get(id) ?? id;
  const teamALabel = match ? `${nameOf(match.teamA[0])} / ${nameOf(match.teamA[1])}` : "Team A";
  const teamBLabel = match ? `${nameOf(match.teamB[0])} / ${nameOf(match.teamB[1])}` : "Team B";
  const modeLabel = formatTournamentMode(props.tournament.config.mode);
  const points = props.tournament.config.pointsPerMatch;

  return (
    <>
      <ScoreEntrySheet
        visible={Boolean(props.scoreEntry)}
        title={match ? `Court ${match.court}` : "Score"}
        contextLine={`${modeLabel} scoring · to ${points} points`}
        teamALabel={teamALabel}
        teamBLabel={teamBLabel}
        scoreA={props.scoreEntry?.scoreA ?? null}
        scoreB={props.scoreEntry?.scoreB ?? null}
        canUndo={Boolean(props.scoreEntry && props.scoreEntry.undoStack.length > 0)}
        saveDisabled={props.savingScore}
        max={points}
        onChangeScoreA={props.onChangeScoreA}
        onChangeScoreB={props.onChangeScoreB}
        onUndo={props.onUndoScoreEntry}
        onSave={() => void props.onSaveScoreEntry()}
        onDismiss={props.onCloseScoreEntry}
      />
      <AlertSheet
        visible={Boolean(props.pendingCompletedEditMatchId)}
        variant="warning"
        title="Edit completed score?"
        message="This match is already saved. Changing it updates the leaderboard."
        primaryAction={{ label: "Edit score", onPress: props.onConfirmEditCompletedScore }}
        secondaryAction={{ label: "Cancel", onPress: props.onCancelEditCompletedScore }}
        onDismiss={props.onCancelEditCompletedScore}
      />
      <AlertSheet
        visible={Boolean(props.scoreSheetError)}
        variant="error"
        title="Cannot save score"
        message={props.scoreSheetError || "Please try again."}
        primaryAction={{
          label: props.scoreEntry ? "Retry" : "OK",
          onPress: () => {
            if (props.scoreEntry) void props.onSaveScoreEntry();
            else props.onClearScoreSheetError();
          }
        }}
        secondaryAction={
          props.scoreEntry
            ? { label: "Dismiss", onPress: props.onClearScoreSheetError }
            : undefined
        }
        onDismiss={props.onClearScoreSheetError}
      />
    </>
  );
}
