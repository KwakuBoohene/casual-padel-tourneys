import type { LiveTournamentState } from "../types";
import { LiveTournamentView } from "./LiveTournamentView";

interface OrganizerLiveScreenProps {
  tournament: LiveTournamentState;
  viewerBaseUrl: string;
  errorText: string;
  activeRound: LiveTournamentState["rounds"][number] | null;
  displayedRound: LiveTournamentState["rounds"][number] | null;
  sortedRounds: LiveTournamentState["rounds"];
  selectedRoundIndex: number;
  isLastRound: boolean;
  isTournamentCompleted: boolean;
  isEditingCompletedTournament: boolean;
  showLiveOptionsModal: boolean;
  showAdjustCourtsConfirmModal: boolean;
  tournamentNameDraft: string;
  roundsLeft: number;
  estimatedMinutesLeft: number;
  currentCourts: number;
  proposedCourts: number;
  maxCourts: number;
  canAdjustCourts: boolean;
  scorePicker: { matchId: string; side: "scoreA" | "scoreB" } | null;
  focusSubmitMatchId: string | null;
  scoreInputs: Record<string, { scoreA: string; scoreB: string }>;
  playerNameById: Map<string, string>;
  showEditConfirmModal: boolean;
  onBackToList: () => void;
  onViewLeaderboard: () => void;
  onRefresh: () => void;
  onFinishTournament: () => void;
  onChangeTournamentName: (value: string) => void;
  onChangeProposedCourts: (value: number) => void;
  onSaveTournamentName: () => void;
  onOpenEditConfirm: () => void;
  onCloseEditConfirm: () => void;
  onConfirmEditGame: () => void;
  onOpenLiveOptions: () => void;
  onCloseLiveOptions: () => void;
  onOpenAdjustCourtsConfirm: () => void;
  onCloseAdjustCourtsConfirm: () => void;
  onConfirmAdjustCourts: () => void;
  onSaveGameEdits: () => void;
  onOpenScorePicker: (matchId: string, side: "scoreA" | "scoreB") => void;
  onCloseScorePicker: () => void;
  onSelectScoreFromPicker: (value: number) => void;
  onResetScoreForMatch: (matchId: string) => void;
  onSubmitFocusHandled: () => void;
  onUpdateScoreInput: (matchId: string, side: "scoreA" | "scoreB", value: string) => void;
  onPrevRound: () => void;
  onNextRound: () => void;
  onSubmitRoundScores: () => void;
}

export function OrganizerLiveScreen(props: OrganizerLiveScreenProps) {
  return (
    <LiveTournamentView
      tournament={props.tournament}
      viewerBaseUrl={props.viewerBaseUrl}
      errorText={props.errorText}
      activeRound={props.activeRound}
      displayedRound={props.displayedRound}
      sortedRounds={props.sortedRounds}
      selectedRoundIndex={props.selectedRoundIndex}
      isLastRound={props.isLastRound}
      isTournamentCompleted={props.isTournamentCompleted}
      isEditingCompletedTournament={props.isEditingCompletedTournament}
      showLiveOptionsModal={props.showLiveOptionsModal}
      showAdjustCourtsConfirmModal={props.showAdjustCourtsConfirmModal}
      tournamentNameDraft={props.tournamentNameDraft}
      roundsLeft={props.roundsLeft}
      estimatedMinutesLeft={props.estimatedMinutesLeft}
      currentCourts={props.currentCourts}
      proposedCourts={props.proposedCourts}
      maxCourts={props.maxCourts}
      canAdjustCourts={props.canAdjustCourts}
      scorePicker={props.scorePicker}
      focusSubmitMatchId={props.focusSubmitMatchId}
      onChangeTournamentName={props.onChangeTournamentName}
      onChangeProposedCourts={props.onChangeProposedCourts}
      onSaveTournamentName={props.onSaveTournamentName}
      scoreInputs={props.scoreInputs}
      playerNameById={props.playerNameById}
      showEditConfirmModal={props.showEditConfirmModal}
      onBackToList={props.onBackToList}
      onViewLeaderboard={props.onViewLeaderboard}
      onRefresh={props.onRefresh}
      onFinishTournament={props.onFinishTournament}
      onOpenEditConfirm={props.onOpenEditConfirm}
      onCloseEditConfirm={props.onCloseEditConfirm}
      onConfirmEditGame={props.onConfirmEditGame}
      onOpenLiveOptions={props.onOpenLiveOptions}
      onCloseLiveOptions={props.onCloseLiveOptions}
      onOpenAdjustCourtsConfirm={props.onOpenAdjustCourtsConfirm}
      onCloseAdjustCourtsConfirm={props.onCloseAdjustCourtsConfirm}
      onConfirmAdjustCourts={props.onConfirmAdjustCourts}
      onSaveGameEdits={props.onSaveGameEdits}
      onOpenScorePicker={props.onOpenScorePicker}
      onCloseScorePicker={props.onCloseScorePicker}
      onSelectScoreFromPicker={props.onSelectScoreFromPicker}
      onResetScoreForMatch={props.onResetScoreForMatch}
      onSubmitFocusHandled={props.onSubmitFocusHandled}
      onUpdateScoreInput={props.onUpdateScoreInput}
      onPrevRound={props.onPrevRound}
      onNextRound={props.onNextRound}
      onSubmitRoundScores={props.onSubmitRoundScores}
    />
  );
}

