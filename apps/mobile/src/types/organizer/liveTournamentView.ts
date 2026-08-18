import type { MatchSet, PlayerGender } from "@padel/shared";

import type { LiveTournamentState } from "./tournament";

export type LiveRound = LiveTournamentState["rounds"][number];

export interface LiveTournamentSessionState {
  tournament: LiveTournamentState;
  viewerBaseUrl: string;
  errorText: string;
  activeRound: LiveRound | null;
  displayedRound: LiveRound | null;
  sortedRounds: LiveRound[];
  selectedRoundIndex: number;
  isLastRound: boolean;
  isTournamentCompleted: boolean;
  isEditingCompletedTournament: boolean;
  tournamentNameDraft: string;
  roundsLeft: number;
  estimatedMinutesLeft: number;
  currentCourts: number;
  proposedCourts: number;
  maxCourts: number;
  canAdjustCourts: boolean;
  playerNameById: Map<string, string>;
  canGenerateNextRound?: boolean;
  generatingNextRound?: boolean;
  canFinishNight?: boolean;
}

export interface LiveTournamentScoreState {
  scoreInputs: Record<string, { scoreA: string; scoreB: string }>;
  scoreEntry: {
    matchId: string;
    scoreA: number | null;
    scoreB: number | null;
    sets: MatchSet[];
    undoStack: { scoreA: number | null; scoreB: number | null }[];
  } | null;
  scoreEntryContextLine: string | null;
  scoreEntryCanComplete: boolean;
  scoreEntrySetComplete: boolean;
  scoreEntryPrimaryAction: "DRAFT" | "NEXT_SET" | "COMPLETE" | null;
  scoreEntryPlusDisabledA: boolean;
  scoreEntryPlusDisabledB: boolean;
  savingScore: boolean;
  pendingCompletedEditMatchId: string | null;
  scoreSheetError: string | null;
  focusSubmitMatchId: string | null;
}

export interface LiveTournamentSheetState {
  showEditConfirmModal: boolean;
  showFinishConfirmModal: boolean;
  showLiveOptionsModal: boolean;
  showAdjustCourtsConfirmModal: boolean;
  showAddPendingPlayerModal: boolean;
  pendingPlayerNameDraft: string;
  pendingPlayerGender: PlayerGender | undefined;
  showIntegrateConfirmModal: boolean;
  renamePlayersVisible: boolean;
  renameDrafts: Record<string, string>;
  renameSaving: boolean;
  careerSaving: boolean;
}

export interface LiveTournamentActions {
  onOpenRenamePlayers: () => void;
  onCloseRenamePlayers: () => void;
  onChangeRenameDraft: (playerId: string, name: string) => void;
  onSaveRenames: () => void;
  onOpenAddPendingPlayer: () => void;
  onCloseAddPendingPlayer: () => void;
  onChangePendingPlayerName: (value: string) => void;
  onChangePendingPlayerGender: (gender: PlayerGender) => void;
  onSubmitAddPendingPlayer: () => void;
  onOpenIntegrateConfirm: () => void;
  onCloseIntegrateConfirm: () => void;
  onConfirmIntegratePendingPlayers: () => void;
  onChangeTournamentName: (value: string) => void;
  onChangeProposedCourts: (value: number) => void;
  onSaveTournamentName: () => void;
  onBackToList: () => void;
  onViewLeaderboard: () => void;
  onRefresh: () => void;
  onFinishTournament: () => void;
  onOpenFinishConfirm: () => void;
  onCloseFinishConfirm: () => void;
  onOpenEditConfirm: () => void;
  onCloseEditConfirm: () => void;
  onConfirmEditGame: () => void;
  onOpenLiveOptions: () => void;
  onCloseLiveOptions: () => void;
  onOpenAdjustCourtsConfirm: () => void;
  onCloseAdjustCourtsConfirm: () => void;
  onConfirmAdjustCourts: () => void;
  onSetContributeToCareerLeaderboard: (value: boolean) => void;
  onSaveGameEdits: () => void;
  onOpenScoreEntry: (matchId: string) => void;
  onCloseScoreEntry: () => void;
  onChangeScoreA: (value: number) => void;
  onChangeScoreB: (value: number) => void;
  onUndoScoreEntry: () => void;
  onSaveScoreEntry: (sets?: MatchSet[]) => void;
  onAdvanceRegularSet?: (sets?: MatchSet[]) => void;
  onSaveScoreDraft?: () => void;
  onConfirmEditCompletedScore: () => void;
  onCancelEditCompletedScore: () => void;
  onClearScoreSheetError: () => void;
  onSubmitFocusHandled: () => void;
  onUpdateScoreInput: (matchId: string, side: "scoreA" | "scoreB", value: string) => void;
  onPrevRound: () => void;
  onNextRound: () => void;
  onSubmitRoundScores: () => void;
  onGenerateNextRound?: () => void;
}

export interface LiveTournamentViewProps {
  session: LiveTournamentSessionState;
  score: LiveTournamentScoreState;
  sheets: LiveTournamentSheetState;
  actions: LiveTournamentActions;
}
