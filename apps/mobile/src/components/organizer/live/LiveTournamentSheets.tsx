import { useState } from "react";

import type { LiveTournamentViewProps } from "../../../types/organizer/liveTournamentView";
import type { ConfigSummaryRow } from "../../../utilities/organizer/tournamentConfigSummary";

import { LiveAdjustCourtsSheet } from "./LiveAdjustCourtsSheet";
import { LiveRenamePlayersSheet } from "./LiveRenamePlayersSheet";
import { LiveScoreEntrySheets } from "./LiveScoreEntrySheets";
import { LiveTournamentOptionsSheet } from "./LiveTournamentOptionsSheet";
import {
  LiveTournamentConfirmSheets,
  LiveTournamentPendingSheet
} from "./LiveTournamentPendingSheet";

type LiveTournamentSheetsProps = LiveTournamentViewProps & {
  configRows: ConfigSummaryRow[];
  allowEditAfterComplete: boolean;
  onCopyShareLink: () => void;
  linkCopied: boolean;
};

export function LiveTournamentSheets({
  session,
  score,
  sheets,
  actions,
  configRows,
  allowEditAfterComplete,
  onCopyShareLink,
  linkCopied
}: LiveTournamentSheetsProps) {
  const [showAdjustCourtsSheet, setShowAdjustCourtsSheet] = useState(false);

  return (
    <>
      <LiveTournamentConfirmSheets
        showEditConfirmModal={sheets.showEditConfirmModal}
        showAdjustCourtsConfirmModal={sheets.showAdjustCourtsConfirmModal}
        showIntegrateConfirmModal={sheets.showIntegrateConfirmModal}
        showFinishConfirmModal={sheets.showFinishConfirmModal}
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
        onCloseFinishConfirm={actions.onCloseFinishConfirm}
        onConfirmFinishTournament={() => {
          actions.onCloseFinishConfirm();
          actions.onFinishTournament();
        }}
      />
      <LiveTournamentOptionsSheet
        visible={sheets.showLiveOptionsModal}
        canAdjustCourts={session.canAdjustCourts}
        canFinish={session.canFinishNight ?? session.isTournamentCompleted}
        isMexicano={session.tournament.config.mode === "MEXICANO"}
        isTournamentCompleted={session.isTournamentCompleted}
        isEditingCompletedTournament={session.isEditingCompletedTournament}
        allowEditAfterComplete={allowEditAfterComplete}
        endedAt={session.tournament.endedAt}
        configRows={configRows}
        linkCopied={linkCopied}
        onClose={actions.onCloseLiveOptions}
        onCopyShareLink={onCopyShareLink}
        onOpenRenamePlayers={actions.onOpenRenamePlayers}
        onOpenAdjustCourts={() => setShowAdjustCourtsSheet(true)}
        onOpenAddPendingPlayer={actions.onOpenAddPendingPlayer}
        onOpenEditGame={actions.onOpenEditConfirm}
        onOpenFinishConfirm={actions.onOpenFinishConfirm}
        onBackToList={actions.onBackToList}
        contributeToCareerLeaderboard={session.tournament.config.contributeToCareerLeaderboard !== false}
        careerSaving={sheets.careerSaving}
        onSetContributeToCareerLeaderboard={actions.onSetContributeToCareerLeaderboard}
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
        visible={sheets.showAddPendingPlayerModal}
        nameDraft={sheets.pendingPlayerNameDraft}
        gender={sheets.pendingPlayerGender}
        onClose={actions.onCloseAddPendingPlayer}
        onChangeName={actions.onChangePendingPlayerName}
        onChangeGender={actions.onChangePendingPlayerGender}
        onSubmit={actions.onSubmitAddPendingPlayer}
      />
    </>
  );
}
