import * as Clipboard from "expo-clipboard";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { layoutTokens, useBreakpoint } from "../../../layout";
import { radius, spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { LiveTournamentHeader } from "./LiveTournamentHeader";
import { LiveTournamentMatchCard } from "./LiveTournamentMatchCard";
import {
  LiveTournamentOptionsSheet,
  LiveTournamentScorePickerSheet
} from "./LiveTournamentOptionsSheet";
import {
  LiveTournamentConfirmSheets,
  LiveTournamentPendingSheet
} from "./LiveTournamentPendingSheet";
import { LiveTournamentRoundBar } from "./LiveTournamentRoundBar";
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
  const onCopyShareLink = useCallback(async () => {
    await Clipboard.setStringAsync(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [shareUrl]);

  const canEditScores = !props.isTournamentCompleted || props.isEditingCompletedTournament;
  const roundsCount = props.sortedRounds.length;

  useEffect(() => {
    if (props.focusSubmitMatchId) {
      props.onSubmitFocusHandled();
    }
  }, [props.focusSubmitMatchId, props.onSubmitFocusHandled]);

  const scrollPad = { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background };
  const header = (
    <>
      <LiveTournamentHeader
        tournament={props.tournament}
        tournamentNameDraft={props.tournamentNameDraft}
        isEditingCompletedTournament={props.isEditingCompletedTournament}
        roundsLeft={props.roundsLeft}
        estimatedMinutesLeft={props.estimatedMinutesLeft}
        onBackToList={props.onBackToList}
        onViewLeaderboard={props.onViewLeaderboard}
        onOpenLiveOptions={props.onOpenLiveOptions}
        onChangeTournamentName={props.onChangeTournamentName}
        onSaveTournamentName={props.onSaveTournamentName}
        onRefresh={props.onRefresh}
        onOpenAddPendingPlayer={props.onOpenAddPendingPlayer}
        onOpenIntegrateConfirm={props.onOpenIntegrateConfirm}
      />
      <LiveTournamentRoundBar
        displayedRound={props.displayedRound}
        activeRound={props.activeRound}
        selectedRoundIndex={props.selectedRoundIndex}
        roundsCount={roundsCount}
        canGoPrev={props.selectedRoundIndex > 0}
        canGoNext={props.selectedRoundIndex < roundsCount - 1 && roundsCount > 0}
        isLastRound={props.isLastRound}
        isTournamentCompleted={props.isTournamentCompleted}
        isEditingCompletedTournament={props.isEditingCompletedTournament}
        onPrevRound={props.onPrevRound}
        onNextRound={props.onNextRound}
        onFinishTournament={props.onFinishTournament}
        onOpenEditConfirm={props.onOpenEditConfirm}
        onSaveGameEdits={props.onSaveGameEdits}
      />
    </>
  );

  const matches = (
    <>
      {(props.displayedRound?.matches ?? []).map((match) => (
        <LiveTournamentMatchCard
          key={match.id}
          match={match}
          canEditScores={canEditScores}
          scorePicker={props.scorePicker}
          scoreInputs={props.scoreInputs}
          playerNameById={props.playerNameById}
          onOpenScorePicker={props.onOpenScorePicker}
        />
      ))}
      {canEditScores && props.displayedRound && props.displayedRound.matches.length > 0 ? (
        <Pressable
          onPress={() => void props.onSubmitRoundScores()}
          style={{
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center"
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Submit round scores</Text>
        </Pressable>
      ) : null}
    </>
  );

  const share = (
    <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
      <Text style={{ fontWeight: "700", color: colors.text }}>Shareable Link</Text>
      <Pressable onPress={onCopyShareLink} accessibilityRole="button" accessibilityLabel="Copy shareable tournament link">
        <Text style={{ color: linkCopied ? colors.primary : colors.muted }}>{shareUrl}</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: linkCopied ? colors.primary : colors.muted }}>
          {linkCopied ? "Copied to clipboard" : "Tap to copy"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Fragment>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: "row", gap: spacing.md, minHeight: 0 }}>
          <ScrollView style={{ width: sidebarWidth, flexShrink: 0 }} contentContainerStyle={scrollPad}>
            {header}
            {share}
          </ScrollView>
          <ScrollView style={{ flex: 1, minWidth: 0 }} contentContainerStyle={scrollPad}>
            {matches}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={scrollPad}>
          {header}
          {matches}
          {share}
        </ScrollView>
      )}
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
        onClose={props.onCloseLiveOptions}
        onChangeProposedCourts={props.onChangeProposedCourts}
        onOpenAdjustCourtsConfirm={props.onOpenAdjustCourtsConfirm}
      />
      <LiveTournamentScorePickerSheet
        visible={Boolean(props.scorePicker)}
        pointsPerMatch={props.tournament.config.pointsPerMatch}
        scorePicker={props.scorePicker}
        onClose={props.onCloseScorePicker}
        onSelect={props.onSelectScoreFromPicker}
        onReset={props.onResetScoreForMatch}
      />
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
      {props.errorText ? <Text style={{ color: colors.danger }}>Error: {props.errorText}</Text> : null}
    </Fragment>
  );
}
