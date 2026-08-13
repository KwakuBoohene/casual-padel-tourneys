import * as Clipboard from "expo-clipboard";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import { layoutTokens, useBreakpoint } from "../../../layout";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { LiveTournamentActions } from "./LiveTournamentActions";
import { LiveTournamentHeader } from "./LiveTournamentHeader";
import { LiveTournamentMatchCard } from "./LiveTournamentMatchCard";
import { LiveTournamentSheets } from "./LiveTournamentSheets";
import type { LiveTournamentViewProps } from "./liveTournamentView.types";

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

  const canEditScores = !props.isTournamentCompleted || props.isEditingCompletedTournament;
  const roundsCount = props.sortedRounds.length;
  const canSubmitScores =
    canEditScores && Boolean(props.displayedRound && props.displayedRound.matches.length > 0);

  useEffect(() => {
    if (props.focusSubmitMatchId) props.onSubmitFocusHandled();
  }, [props.focusSubmitMatchId, props.onSubmitFocusHandled]);

  useEffect(() => {
    if (props.errorText) setShowError(true);
  }, [props.errorText]);

  const scrollPad = {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background
  };

  const header = (
    <LiveTournamentHeader
      tournament={props.tournament}
      tournamentNameDraft={props.tournamentNameDraft}
      isEditingCompletedTournament={props.isEditingCompletedTournament}
      roundsCount={roundsCount}
      displayedRoundNumber={props.displayedRound?.roundNumber ?? null}
      canGoPrev={props.selectedRoundIndex > 0}
      canGoNext={props.selectedRoundIndex < roundsCount - 1 && roundsCount > 0}
      onChangeTournamentName={props.onChangeTournamentName}
      onSaveTournamentName={props.onSaveTournamentName}
      onOpenAddPendingPlayer={props.onOpenAddPendingPlayer}
      onOpenIntegrateConfirm={props.onOpenIntegrateConfirm}
      onPrevRound={props.onPrevRound}
      onNextRound={props.onNextRound}
    />
  );

  const matches = (props.displayedRound?.matches ?? []).map((match) => (
    <LiveTournamentMatchCard
      key={match.id}
      match={match}
      canEditScores={canEditScores}
      scoreInputs={props.scoreInputs}
      playerNameById={props.playerNameById}
      onOpenScorePicker={props.onOpenScorePicker}
    />
  ));

  const actions = (
    <LiveTournamentActions
      canSubmitScores={canSubmitScores}
      isTournamentCompleted={props.isTournamentCompleted}
      isEditingCompletedTournament={props.isEditingCompletedTournament}
      linkCopied={linkCopied}
      onSubmitRoundScores={() => void props.onSubmitRoundScores()}
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
            {header}
            {actions}
          </ScrollView>
          <ScrollView style={{ flex: 1, minWidth: 0 }} contentContainerStyle={scrollPad}>
            {matches}
          </ScrollView>
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ ...scrollPad, flexGrow: 1 }}>
            {header}
            {matches}
          </ScrollView>
          <View
            style={{
              paddingHorizontal: spacing.xl,
              paddingBottom: spacing.xl,
              paddingTop: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.background
            }}
          >
            {actions}
          </View>
        </View>
      )}
      <LiveTournamentSheets
        props={props}
        showError={showError}
        onDismissError={() => setShowError(false)}
        onCopyShareLink={() => void onCopyShareLink()}
      />
    </Fragment>
  );
}
