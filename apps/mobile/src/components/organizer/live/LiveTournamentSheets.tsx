import { useState } from "react";

import { AlertSheet } from "../../../components/sheets";

import { LiveAdjustCourtsSheet } from "./LiveAdjustCourtsSheet";
import { LiveRenamePlayersSheet } from "./LiveRenamePlayersSheet";
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
  linkCopied: boolean;
}

export function LiveTournamentSheets({
  props,
  showError,
  onDismissError,
  onCopyShareLink,
  linkCopied
}: LiveTournamentSheetsProps) {
  const [showAdjustCourtsSheet, setShowAdjustCourtsSheet] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  return (
    <>
      <LiveTournamentConfirmSheets
        showEditConfirmModal={props.showEditConfirmModal}
        showAdjustCourtsConfirmModal={props.showAdjustCourtsConfirmModal}
        showIntegrateConfirmModal={props.showIntegrateConfirmModal}
        showFinishConfirmModal={showFinishConfirm}
        currentCourts={props.currentCourts}
        proposedCourts={props.proposedCourts}
        pendingCount={props.tournament.pendingPlayers.length}
        onCloseEditConfirm={props.onCloseEditConfirm}
        onConfirmEditGame={props.onConfirmEditGame}
        onCloseAdjustCourtsConfirm={props.onCloseAdjustCourtsConfirm}
        onConfirmAdjustCourts={props.onConfirmAdjustCourts}
        onCloseIntegrateConfirm={props.onCloseIntegrateConfirm}
        onConfirmIntegratePendingPlayers={props.onConfirmIntegratePendingPlayers}
        onCloseFinishConfirm={() => setShowFinishConfirm(false)}
        onConfirmFinishTournament={() => {
          setShowFinishConfirm(false);
          props.onFinishTournament();
        }}
      />
      <LiveTournamentOptionsSheet
        visible={props.showLiveOptionsModal}
        canAdjustCourts={props.canAdjustCourts}
        canFinish={props.isTournamentCompleted}
        linkCopied={linkCopied}
        onClose={props.onCloseLiveOptions}
        onCopyShareLink={onCopyShareLink}
        onOpenRenamePlayers={props.onOpenRenamePlayers}
        onOpenAdjustCourts={() => setShowAdjustCourtsSheet(true)}
        onOpenAddPendingPlayer={props.onOpenAddPendingPlayer}
        onOpenFinishConfirm={() => setShowFinishConfirm(true)}
      />
      <LiveAdjustCourtsSheet
        visible={showAdjustCourtsSheet}
        currentCourts={props.currentCourts}
        proposedCourts={props.proposedCourts}
        maxCourts={props.maxCourts}
        onClose={() => setShowAdjustCourtsSheet(false)}
        onChangeProposedCourts={props.onChangeProposedCourts}
        onContinue={() => {
          setShowAdjustCourtsSheet(false);
          props.onOpenAdjustCourtsConfirm();
        }}
      />
      <LiveRenamePlayersSheet
        visible={props.renamePlayersVisible}
        players={props.tournament.players}
        drafts={props.renameDrafts}
        saving={props.renameSaving}
        onChangeDraft={props.onChangeRenameDraft}
        onSave={() => void props.onSaveRenames()}
        onClose={props.onCloseRenamePlayers}
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
