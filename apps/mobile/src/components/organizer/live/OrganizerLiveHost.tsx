import { router } from "expo-router";

import { PageShell } from "../../../layout";
import { useOrganizerSession } from "../../../providers/OrganizerSessionProvider";
import { tournamentLeaderboardPath } from "../../../utilities/organizer/tournamentRoutes";

import { OrganizerLiveScreen } from "./OrganizerLiveScreen";

/** Wires session live + score state into OrganizerLiveScreen for the route tree. */
export function OrganizerLiveHost() {
  const org = useOrganizerSession();
  const { liveTournament } = org;

  if (!liveTournament) {
    return null;
  }

  return (
    <PageShell>
      <OrganizerLiveScreen
        tournament={liveTournament}
        viewerBaseUrl={org.viewerBaseUrl}
        errorText={org.errorText}
        activeRound={org.activeRound}
        displayedRound={org.displayedRound}
        sortedRounds={org.sortedRounds}
        selectedRoundIndex={org.selectedRoundIndex}
        isLastRound={org.isLastRound}
        isTournamentCompleted={org.isTournamentCompleted}
        isEditingCompletedTournament={org.isEditingCompletedTournament}
        showLiveOptionsModal={org.showLiveOptionsModal}
        showAdjustCourtsConfirmModal={org.showAdjustCourtsConfirmModal}
        tournamentNameDraft={org.liveTournamentNameDraft}
        roundsLeft={org.liveTimeStatus.roundsLeft}
        estimatedMinutesLeft={org.liveTimeStatus.estimatedMinutesLeft}
        currentCourts={liveTournament.config.courts}
        proposedCourts={org.proposedCourts}
        maxCourts={org.maxCourts}
        canAdjustCourts={org.canAdjustCourts}
        scoreEntry={org.scoreEntry}
        scoreEntryContextLine={org.scoreEntryContextLine}
        scoreEntryCanComplete={org.scoreEntryCanComplete}
        scoreEntryPlusDisabledA={org.scoreEntryPlusDisabledA}
        scoreEntryPlusDisabledB={org.scoreEntryPlusDisabledB}
        savingScore={org.savingScore}
        pendingCompletedEditMatchId={org.pendingCompletedEditMatchId}
        scoreSheetError={org.scoreSheetError}
        focusSubmitMatchId={org.focusSubmitMatchId}
        scoreInputs={org.scoreInputs}
        playerNameById={org.playerNameById}
        showEditConfirmModal={org.showEditConfirmModal}
        onBackToList={() => {
          org.setLiveTournament(null);
          org.setStep("LIST");
          router.replace("/tournaments");
        }}
        onViewLeaderboard={() => router.push(tournamentLeaderboardPath(liveTournament.id))}
        onRefresh={() => void org.refreshTournament()}
        onFinishTournament={() => void org.finishTournament()}
        canGenerateNextRound={org.canGenerateNextRound}
        generatingNextRound={org.generatingNextRound}
        canFinishNight={org.canFinishNight}
        onGenerateNextRound={() => void org.generateNextMexicanoRound()}
        onChangeTournamentName={org.setLiveTournamentNameDraft}
        onChangeProposedCourts={org.setProposedCourts}
        onSaveTournamentName={() => void org.saveTournamentName()}
        onOpenEditConfirm={() => org.setShowEditConfirmModal(true)}
        onCloseEditConfirm={() => org.setShowEditConfirmModal(false)}
        onConfirmEditGame={() => {
          org.setShowEditConfirmModal(false);
          org.setIsEditingCompletedTournament(true);
        }}
        onOpenLiveOptions={() => org.setShowLiveOptionsModal(true)}
        onCloseLiveOptions={() => org.setShowLiveOptionsModal(false)}
        onOpenAdjustCourtsConfirm={() => {
          org.setShowLiveOptionsModal(false);
          org.setShowAdjustCourtsConfirmModal(true);
        }}
        onCloseAdjustCourtsConfirm={() => org.setShowAdjustCourtsConfirmModal(false)}
        onConfirmAdjustCourts={() => void org.adjustTournamentCourts()}
        onSaveGameEdits={() => org.setIsEditingCompletedTournament(false)}
        onOpenScoreEntry={org.requestOpenScoreEntry}
        onCloseScoreEntry={org.closeScoreEntry}
        onChangeScoreA={org.changeScoreA}
        onChangeScoreB={org.changeScoreB}
        onUndoScoreEntry={org.undoScoreEntry}
        onSaveScoreEntry={() => void org.saveScoreEntry()}
        onSaveScoreDraft={() => void org.saveScoreDraft()}
        onConfirmEditCompletedScore={org.confirmEditCompletedScore}
        onCancelEditCompletedScore={org.cancelEditCompletedScore}
        onClearScoreSheetError={org.clearScoreSheetError}
        onSubmitFocusHandled={() => org.setFocusSubmitMatchId(null)}
        onUpdateScoreInput={org.updateScoreInput}
        onPrevRound={org.goToPrevRound}
        onNextRound={org.goToNextRound}
        onSubmitRoundScores={() => void org.submitRoundScores()}
        showAddPendingPlayerModal={org.showAddPendingPlayerModal}
        pendingPlayerNameDraft={org.pendingPlayerNameDraft}
        pendingPlayerGender={org.pendingPlayerGender}
        showIntegrateConfirmModal={org.showIntegrateConfirmModal}
        onOpenAddPendingPlayer={org.openAddPendingPlayerModal}
        onCloseAddPendingPlayer={org.closeAddPendingPlayerModal}
        onChangePendingPlayerName={org.setPendingPlayerNameDraft}
        onChangePendingPlayerGender={org.setPendingPlayerGender}
        onSubmitAddPendingPlayer={() => void org.submitAddPendingPlayer()}
        onOpenIntegrateConfirm={org.openIntegrateConfirmModal}
        onCloseIntegrateConfirm={org.closeIntegrateConfirmModal}
        onConfirmIntegratePendingPlayers={() => void org.confirmIntegratePendingPlayers()}
        renamePlayersVisible={org.renamePlayersVisible}
        renameDrafts={org.renameDrafts}
        renameSaving={org.renameSaving}
        onOpenRenamePlayers={org.openRenamePlayers}
        onCloseRenamePlayers={org.closeRenamePlayers}
        onChangeRenameDraft={org.changeRenameDraft}
        onSaveRenames={() => void org.saveRenames()}
      />
    </PageShell>
  );
}
