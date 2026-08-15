import { AlertSheet } from "../../../components/sheets";

import { LiveScoreEntrySheets } from "./LiveScoreEntrySheets";
import { LiveTournamentOptionsSheet } from "./LiveTournamentOptionsSheet";
import {
  LiveTournamentConfirmSheets,
  LiveTournamentPendingSheet
} from "./LiveTournamentPendingSheet";
import type { LiveTournamentViewProps } from "./liveTournamentView.types";

interface LiveTournamentSheetsProps {
  props: LiveTournamentViewProps;
  showError: boolean;
  onDismissError: () => void;
  onCopyShareLink: () => void;
}

export function LiveTournamentSheets({
  props,
  showError,
  onDismissError,
  onCopyShareLink
}: LiveTournamentSheetsProps) {
  return (
    <>
      <LiveTournamentConfirmSheets
        showEditConfirmModal={props.showEditConfirmModal}
        showAdjustCourtsConfirmModal={props.showAdjustCourtsConfirmModal}
        showIntegrateConfirmModal={props.showIntegrateConfirmModal}
        currentCourts={props.currentCourts}
        proposedCourts={props.proposedCourts}
        pendingCount={props.tournament.pendingPlayers.length}
        onCloseEditConfirm={props.onCloseEditConfirm}
        onConfirmEditGame={props.onConfirmEditGame}
        onCloseAdjustCourtsConfirm={props.onCloseAdjustCourtsConfirm}
        onConfirmAdjustCourts={props.onConfirmAdjustCourts}
        onCloseIntegrateConfirm={props.onCloseIntegrateConfirm}
        onConfirmIntegratePendingPlayers={props.onConfirmIntegratePendingPlayers}
      />
      <LiveTournamentOptionsSheet
        visible={props.showLiveOptionsModal}
        currentCourts={props.currentCourts}
        proposedCourts={props.proposedCourts}
        maxCourts={props.maxCourts}
        canAdjustCourts={props.canAdjustCourts}
        canFinish={props.isLastRound && !props.isTournamentCompleted}
        onClose={props.onCloseLiveOptions}
        onChangeProposedCourts={props.onChangeProposedCourts}
        onOpenAdjustCourtsConfirm={props.onOpenAdjustCourtsConfirm}
        onCopyShareLink={onCopyShareLink}
        onOpenAddPendingPlayer={props.onOpenAddPendingPlayer}
        onFinishTournament={props.onFinishTournament}
        onBackToList={props.onBackToList}
      />
      <LiveScoreEntrySheets props={props} />
      <LiveTournamentPendingSheet
        tournament={props.tournament}
        errorText={props.errorText}
        visible={props.showAddPendingPlayerModal}
        nameDraft={props.pendingPlayerNameDraft}
        gender={props.pendingPlayerGender}
        onClose={props.onCloseAddPendingPlayer}
        onChangeName={props.onChangePendingPlayerName}
        onChangeGender={props.onChangePendingPlayerGender}
        onSubmit={props.onSubmitAddPendingPlayer}
      />
      <AlertSheet
        visible={showError && Boolean(props.errorText)}
        variant="error"
        title="Something went wrong"
        message={props.errorText || "Please try again."}
        primaryAction={{ label: "OK", onPress: onDismissError }}
        onDismiss={onDismissError}
      />
    </>
  );
}
