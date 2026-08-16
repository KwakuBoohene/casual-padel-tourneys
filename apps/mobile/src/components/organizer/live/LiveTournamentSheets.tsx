import { useState } from "react";

import { AlertSheet } from "../../sheets";
import type { LiveTournamentViewProps } from "../../../types/organizer/liveTournamentView";

import { LiveAdjustCourtsSheet } from "./LiveAdjustCourtsSheet";
import { LiveRenamePlayersSheet } from "./LiveRenamePlayersSheet";
import { LiveScoreEntrySheets } from "./LiveScoreEntrySheets";
import { LiveTournamentOptionsSheet } from "./LiveTournamentOptionsSheet";
import {
  LiveTournamentConfirmSheets,
  LiveTournamentPendingSheet
} from "./LiveTournamentPendingSheet";

type LiveTournamentSheetsProps = LiveTournamentViewProps & {
  showError: boolean;
  onDismissError: () => void;
  onCopyShareLink: () => void;
  linkCopied: boolean;
};

export function LiveTournamentSheets({
  session,
  score,
  sheets,
  actions,
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
        showEditConfirmModal={sheets.showEditConfirmModal}
        showAdjustCourtsConfirmModal={sheets.showAdjustCourtsConfirmModal}
        showIntegrateConfirmModal={sheets.showIntegrateConfirmModal}
        showFinishConfirmModal={showFinishConfirm}
        isMexicano={session.tournament.config.mode === "MEXICANO"}
        currentCourts={session.currentCourts}
        proposedCourts={session.proposedCourts}
        pendingCount={session.tournament.pendingPlayers.length}
        onCloseEditConfirm={actions.onCloseEditConfirm}
        onConfirmEditGame={actions.onConfirmEditGame}
        onCloseAdjustCourtsConfirm={actions.onCloseAdjustCourtsConfirm}
        onConfirmAdjustCourts={actions.onConfirmAdjustCourts}
        onCloseIntegrateConfirm={actions.onCloseIntegrateConfirm}
        onConfirmIntegratePendingPlayers={actions.onConfirmIntegratePendingPlayers}
        onCloseFinishConfirm={() => setShowFinishConfirm(false)}
        onConfirmFinishTournament={() => {
          setShowFinishConfirm(false);
          actions.onFinishTournament();
        }}
      />
      <LiveTournamentOptionsSheet
        visible={sheets.showLiveOptionsModal}
        canAdjustCourts={session.canAdjustCourts}
        canFinish={session.canFinishNight ?? session.isTournamentCompleted}
        isMexicano={session.tournament.config.mode === "MEXICANO"}
        linkCopied={linkCopied}
        onClose={actions.onCloseLiveOptions}
        onCopyShareLink={onCopyShareLink}
        onOpenRenamePlayers={actions.onOpenRenamePlayers}
        onOpenAdjustCourts={() => setShowAdjustCourtsSheet(true)}
        onOpenAddPendingPlayer={actions.onOpenAddPendingPlayer}
        onOpenFinishConfirm={() => setShowFinishConfirm(true)}
        onBackToList={actions.onBackToList}
      />
      <LiveAdjustCourtsSheet
        visible={showAdjustCourtsSheet}
        currentCourts={session.currentCourts}
        proposedCourts={session.proposedCourts}
        maxCourts={session.maxCourts}
        onClose={() => setShowAdjustCourtsSheet(false)}
        onChangeProposedCourts={actions.onChangeProposedCourts}
        onContinue={() => {
          setShowAdjustCourtsSheet(false);
          actions.onOpenAdjustCourtsConfirm();
        }}
      />
      <LiveRenamePlayersSheet
        visible={sheets.renamePlayersVisible}
        players={session.tournament.players}
        drafts={sheets.renameDrafts}
        saving={sheets.renameSaving}
        onChangeDraft={actions.onChangeRenameDraft}
        onSave={() => void actions.onSaveRenames()}
        onClose={actions.onCloseRenamePlayers}
      />
      <LiveScoreEntrySheets session={session} score={score} actions={actions} />
      <LiveTournamentPendingSheet
        tournament={session.tournament}
        errorText={session.errorText}
        visible={sheets.showAddPendingPlayerModal}
        nameDraft={sheets.pendingPlayerNameDraft}
        gender={sheets.pendingPlayerGender}
        onClose={actions.onCloseAddPendingPlayer}
        onChangeName={actions.onChangePendingPlayerName}
        onChangeGender={actions.onChangePendingPlayerGender}
        onSubmit={actions.onSubmitAddPendingPlayer}
      />
      <AlertSheet
        visible={showError && Boolean(session.errorText)}
        variant="error"
        title="Something went wrong"
        message={session.errorText || "Please try again."}
        primaryAction={{ label: "OK", onPress: onDismissError }}
        onDismiss={onDismissError}
      />
    </>
  );
}
