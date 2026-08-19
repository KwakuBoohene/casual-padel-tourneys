import { router } from "expo-router";

import { PageShell } from "../../../layout";
import { useOrganizerSession } from "../../../providers/OrganizerSessionProvider";
import type { LiveTournamentViewProps } from "../../../types/organizer/liveTournamentView";
import { tournamentLeaderboardPath } from "../../../utilities/organizer/tournamentRoutes";

import { OrganizerLiveScreen } from "./OrganizerLiveScreen";

/** Wires session live + score state into OrganizerLiveScreen for the route tree. */
export function OrganizerLiveHost() {
  const org = useOrganizerSession();
  const { liveTournament } = org;

  if (!liveTournament) {
    return null;
  }

  const props: LiveTournamentViewProps = {
    session: {
      tournament: liveTournament,
      viewerBaseUrl: org.viewerBaseUrl,
      errorText: org.errorText,
      activeRound: org.activeRound,
      displayedRound: org.displayedRound,
      sortedRounds: org.sortedRounds,
      selectedRoundIndex: org.selectedRoundIndex,
      isLastRound: org.isLastRound,
      isTournamentCompleted: org.isTournamentCompleted,
      isEditingCompletedTournament: org.isEditingCompletedTournament,
      tournamentNameDraft: org.liveTournamentNameDraft,
      roundsLeft: org.liveTimeStatus.roundsLeft,
      estimatedMinutesLeft: org.liveTimeStatus.estimatedMinutesLeft,
      currentCourts: liveTournament.config.courts,
      proposedCourts: org.proposedCourts,
      maxCourts: org.maxCourts,
      canAdjustCourts: org.canAdjustCourts,
      playerNameById: org.playerNameById,
      canGenerateNextRound: org.canGenerateNextRound,
      generatingNextRound: org.generatingNextRound,
      canFinishNight: org.canFinishNight,
      unfinishedMatchCount: org.unfinishedMatchCount
    },
    score: {
      scoreInputs: org.scoreInputs,
      scoreEntry: org.scoreEntry,
      scoreEntryContextLine: org.scoreEntryContextLine,
      scoreEntryCanComplete: org.scoreEntryCanComplete,
      scoreEntrySetComplete: org.scoreEntrySetComplete,
      scoreEntryPrimaryAction: org.scoreEntryPrimaryAction,
      scoreEntryPlusDisabledA: org.scoreEntryPlusDisabledA,
      scoreEntryPlusDisabledB: org.scoreEntryPlusDisabledB,
      savingScore: org.savingScore,
      pendingCompletedEditMatchId: org.pendingCompletedEditMatchId,
      scoreSheetError: org.scoreSheetError,
      focusSubmitMatchId: org.focusSubmitMatchId
    },
    sheets: {
      showEditConfirmModal: org.showEditConfirmModal,
      showFinishConfirmModal: org.showFinishConfirmModal,
      showLiveOptionsModal: org.showLiveOptionsModal,
      showAdjustCourtsConfirmModal: org.showAdjustCourtsConfirmModal,
      showAddPendingPlayerModal: org.showAddPendingPlayerModal,
      pendingPlayerNameDraft: org.pendingPlayerNameDraft,
      pendingPlayerGender: org.pendingPlayerGender,
      showIntegrateConfirmModal: org.showIntegrateConfirmModal,
      renamePlayersVisible: org.renamePlayersVisible,
      renameDrafts: org.renameDrafts,
      renameSaving: org.renameSaving,
      careerSaving: org.careerSaving
    },
    actions: {
      onBackToList: () => {
        org.setLiveTournament(null);
        router.replace("/tournaments");
      },
      onViewLeaderboard: () => router.push(tournamentLeaderboardPath(liveTournament.id)),
      onRefresh: () => void org.refreshTournament(),
      onFinishTournament: () => void org.finishTournament(),
      onOpenFinishConfirm: () => org.setShowFinishConfirmModal(true),
      onCloseFinishConfirm: () => org.setShowFinishConfirmModal(false),
      onGenerateNextRound: () => void org.generateNextMexicanoRound(),
      onChangeTournamentName: org.setLiveTournamentNameDraft,
      onChangeProposedCourts: org.setProposedCourts,
      onSaveTournamentName: () => void org.saveTournamentName(),
      onOpenEditConfirm: () => org.setShowEditConfirmModal(true),
      onCloseEditConfirm: () => org.setShowEditConfirmModal(false),
      onConfirmEditGame: () => {
        org.setShowEditConfirmModal(false);
        org.setIsEditingCompletedTournament(true);
      },
      onOpenLiveOptions: () => org.setShowLiveOptionsModal(true),
      onCloseLiveOptions: () => org.setShowLiveOptionsModal(false),
      onOpenAdjustCourtsConfirm: () => {
        org.setShowLiveOptionsModal(false);
        org.setShowAdjustCourtsConfirmModal(true);
      },
      onCloseAdjustCourtsConfirm: () => org.setShowAdjustCourtsConfirmModal(false),
      onConfirmAdjustCourts: () => void org.adjustTournamentCourts(),
      onSetContributeToCareerLeaderboard: (value) => void org.setContributeToCareerLeaderboard(value),
      onSaveGameEdits: () => org.setIsEditingCompletedTournament(false),
      onOpenScoreEntry: org.requestOpenScoreEntry,
      onCloseScoreEntry: org.closeScoreEntry,
      onChangeScoreA: org.changeScoreA,
      onChangeScoreB: org.changeScoreB,
      onUndoScoreEntry: org.undoScoreEntry,
      onSaveScoreEntry: (sets) => void org.saveScoreEntry(sets),
      onAdvanceRegularSet: org.advanceRegularSet,
      onSaveScoreDraft: () => void org.saveScoreDraft(),
      onConfirmEditCompletedScore: org.confirmEditCompletedScore,
      onCancelEditCompletedScore: org.cancelEditCompletedScore,
      onClearScoreSheetError: org.clearScoreSheetError,
      onSubmitFocusHandled: () => org.setFocusSubmitMatchId(null),
      onUpdateScoreInput: org.updateScoreInput,
      onPrevRound: org.goToPrevRound,
      onNextRound: org.goToNextRound,
      onSubmitRoundScores: () => void org.submitRoundScores(),
      onOpenAddPendingPlayer: org.openAddPendingPlayerModal,
      onCloseAddPendingPlayer: org.closeAddPendingPlayerModal,
      onChangePendingPlayerName: org.setPendingPlayerNameDraft,
      onChangePendingPlayerGender: org.setPendingPlayerGender,
      onSubmitAddPendingPlayer: () => void org.submitAddPendingPlayer(),
      onOpenIntegrateConfirm: org.openIntegrateConfirmModal,
      onCloseIntegrateConfirm: org.closeIntegrateConfirmModal,
      onConfirmIntegratePendingPlayers: () => void org.confirmIntegratePendingPlayers(),
      onOpenRenamePlayers: org.openRenamePlayers,
      onCloseRenamePlayers: org.closeRenamePlayers,
      onChangeRenameDraft: org.changeRenameDraft,
      onSaveRenames: () => void org.saveRenames()
    }
  };

  return (
    <PageShell>
      <OrganizerLiveScreen {...props} />
    </PageShell>
  );
}
