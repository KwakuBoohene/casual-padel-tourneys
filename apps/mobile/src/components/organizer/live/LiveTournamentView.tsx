import * as Clipboard from "expo-clipboard";
import { Fragment, useCallback, useEffect, useState, type ReactElement } from "react";
import { ScrollView, View } from "react-native";

import { layoutTokens, useBreakpoint } from "../../../layout";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { LiveTournamentActions } from "./LiveTournamentActions";
import { LiveTournamentHeader } from "./LiveTournamentHeader";
import { LiveTournamentMatchList } from "./LiveTournamentMatchList";
import { LiveTournamentSheets } from "./LiveTournamentSheets";
import { LiveTournamentStickyActions } from "./LiveTournamentStickyActions";
import type { LiveTournamentViewProps } from "../../../types/organizer/liveTournamentView";

export type { LiveTournamentViewProps };

export function LiveTournamentView(props: LiveTournamentViewProps) {
  const { colors } = useTheme();
  const { isWide, width } = useBreakpoint();
  const sidebarWidth = Math.min(
    layoutTokens.liveSidebarMaxWidth,
    Math.max(layoutTokens.liveSidebarMinWidth, Math.round(width * 0.32))
  );
  const shareUrl = `${props.viewerBaseUrl}/tournament/${props.tournament.publicToken}`;
  const [linkCopied, setLinkCopied] = useState(false);
  const [showError, setShowError] = useState(false);
  const onCopyShareLink = useCallback(async () => {
    await Clipboard.setStringAsync(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [shareUrl]);

  const {
    focusSubmitMatchId,
    onSubmitFocusHandled,
    errorText,
    isTournamentCompleted,
    isEditingCompletedTournament,
    sortedRounds,
    displayedRound
  } = props;
  const canEditScores = !isTournamentCompleted || isEditingCompletedTournament;
  const roundsCount = sortedRounds.length;
  const matches = displayedRound?.matches ?? [];
  const canSubmitScores = canEditScores && matches.length > 0;

  useEffect(() => {
    if (focusSubmitMatchId) onSubmitFocusHandled();
  }, [focusSubmitMatchId, onSubmitFocusHandled]);

  useEffect(() => {
    if (errorText) setShowError(true);
  }, [errorText]);

  const scrollPad = {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background
  };

  const header = (
    <LiveTournamentHeader
      tournament={props.tournament}
      tournamentNameDraft={props.tournamentNameDraft}
      isEditingCompletedTournament={isEditingCompletedTournament}
      roundsCount={roundsCount}
      openEndedRounds={props.tournament.config.mode === "MEXICANO"}
      displayedRoundNumber={displayedRound?.roundNumber ?? null}
      canGoPrev={props.selectedRoundIndex > 0}
      canGoNext={props.selectedRoundIndex < roundsCount - 1 && roundsCount > 0}
      onBackToList={props.onBackToList}
      onChangeTournamentName={props.onChangeTournamentName}
      onSaveTournamentName={props.onSaveTournamentName}
      onOpenAddPendingPlayer={props.onOpenAddPendingPlayer}
      onOpenIntegrateConfirm={props.onOpenIntegrateConfirm}
      onPrevRound={props.onPrevRound}
      onNextRound={props.onNextRound}
    />
  );

  const matchList = (opts: { header?: ReactElement | null; style?: object }) => (
    <LiveTournamentMatchList
      matches={matches}
      canEditScores={canEditScores}
      scoreInputs={props.scoreInputs}
      playerNameById={props.playerNameById}
      scoringMode={props.tournament.config.scoringMode}
      onOpenScoreEntry={props.onOpenScoreEntry}
      header={opts.header}
      style={opts.style}
      contentContainerStyle={{ ...scrollPad, flexGrow: 1 }}
    />
  );

  const actions = (
    <LiveTournamentActions
      canSubmitScores={canSubmitScores}
      canGenerateNextRound={Boolean(props.canGenerateNextRound)}
      generatingNextRound={Boolean(props.generatingNextRound)}
      isTournamentCompleted={isTournamentCompleted}
      isEditingCompletedTournament={isEditingCompletedTournament}
      allowEditAfterComplete={props.tournament.config.mode !== "MEXICANO"}
      linkCopied={linkCopied}
      onSubmitRoundScores={() => void props.onSubmitRoundScores()}
      onGenerateNextRound={() => void props.onGenerateNextRound?.()}
      onOpenEditConfirm={props.onOpenEditConfirm}
      onSaveGameEdits={props.onSaveGameEdits}
      onShare={() => void onCopyShareLink()}
      onViewLeaderboard={props.onViewLeaderboard}
      onOpenLiveOptions={props.onOpenLiveOptions}
    />
  );

  return (
    <Fragment>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: "row", gap: spacing.md, minHeight: 0 }}>
          <ScrollView style={{ width: sidebarWidth, flexShrink: 0 }} contentContainerStyle={scrollPad}>
            <View style={{ gap: spacing.md }}>
              {header}
              {actions}
            </View>
          </ScrollView>
          {matchList({ style: { flex: 1, minWidth: 0 } })}
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {matchList({
            header: <View style={{ gap: spacing.md, marginBottom: spacing.md }}>{header}</View>,
            style: { flex: 1 }
          })}
          <LiveTournamentStickyActions>{actions}</LiveTournamentStickyActions>
        </View>
      )}
      <LiveTournamentSheets
        props={props}
        showError={showError}
        onDismissError={() => setShowError(false)}
        onCopyShareLink={() => void onCopyShareLink()}
        linkCopied={linkCopied}
      />
    </Fragment>
  );
}
