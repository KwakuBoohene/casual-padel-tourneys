import * as Clipboard from "expo-clipboard";
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { ScrollView, View } from "react-native";

import { layoutTokens, useBreakpoint } from "../../../layout";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import type { LiveTournamentViewProps } from "../../../types/organizer/liveTournamentView";
import { buildLiveTournamentConfigRows } from "../../../utilities/organizer/tournamentConfigSummary";

import { LiveTournamentActions } from "./LiveTournamentActions";
import { LiveTournamentHeader } from "./LiveTournamentHeader";
import { LiveTournamentMatchList } from "./LiveTournamentMatchList";
import { LiveTournamentSheets } from "./LiveTournamentSheets";
import { LiveTournamentStickyActions } from "./LiveTournamentStickyActions";

export type { LiveTournamentViewProps };

export function LiveTournamentView({ session, score, sheets, actions }: LiveTournamentViewProps) {
  const { colors } = useTheme();
  const { isWide, width } = useBreakpoint();
  const sidebarWidth = Math.min(
    layoutTokens.liveSidebarMaxWidth,
    Math.max(layoutTokens.liveSidebarMinWidth, Math.round(width * 0.32))
  );
  const shareUrl = `${session.viewerBaseUrl}/tournament/${session.tournament.publicToken}`;
  const [linkCopied, setLinkCopied] = useState(false);
  const onCopyShareLink = useCallback(async () => {
    await Clipboard.setStringAsync(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [shareUrl]);

  const { focusSubmitMatchId } = score;
  const { onSubmitFocusHandled } = actions;
  const canEditScores = !session.isTournamentCompleted || session.isEditingCompletedTournament;
  const roundsCount = session.sortedRounds.length;
  const matches = session.displayedRound?.matches ?? [];
  const canSubmitScores = canEditScores && matches.length > 0;
  const configRows = useMemo(
    () => buildLiveTournamentConfigRows(session.tournament.config),
    [session.tournament.config]
  );
  const allowEditAfterComplete = session.tournament.config.mode !== "MEXICANO";
  const rotatesRestingPlayers =
    session.tournament.players.length > session.tournament.config.courts * 4;

  useEffect(() => {
    if (focusSubmitMatchId) onSubmitFocusHandled();
  }, [focusSubmitMatchId, onSubmitFocusHandled]);

  const scrollPad = {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background
  };

  const header = (
    <LiveTournamentHeader
      tournament={session.tournament}
      tournamentNameDraft={session.tournamentNameDraft}
      isEditingCompletedTournament={session.isEditingCompletedTournament}
      roundsCount={roundsCount}
      openEndedRounds={session.tournament.config.mode === "MEXICANO"}
      displayedRoundNumber={session.displayedRound?.roundNumber ?? null}
      canGoPrev={session.selectedRoundIndex > 0}
      canGoNext={session.selectedRoundIndex < roundsCount - 1 && roundsCount > 0}
      onBackToList={actions.onBackToList}
      onChangeTournamentName={actions.onChangeTournamentName}
      onSaveTournamentName={actions.onSaveTournamentName}
      onOpenAddPendingPlayer={actions.onOpenAddPendingPlayer}
      onOpenIntegrateConfirm={actions.onOpenIntegrateConfirm}
      onPrevRound={actions.onPrevRound}
      onNextRound={actions.onNextRound}
    />
  );

  const matchList = (opts: { header?: ReactElement | null; style?: object }) => (
    <LiveTournamentMatchList
      matches={matches}
      canEditScores={canEditScores}
      scoreInputs={score.scoreInputs}
      playerNameById={session.playerNameById}
      scoringMode={session.tournament.config.scoringMode}
      onOpenScoreEntry={actions.onOpenScoreEntry}
      header={opts.header}
      style={opts.style}
      contentContainerStyle={{ ...scrollPad, flexGrow: 1 }}
    />
  );

  const actionBar = (
    <LiveTournamentActions
      canSubmitScores={canSubmitScores}
      canGenerateNextRound={Boolean(session.canGenerateNextRound)}
      generatingNextRound={Boolean(session.generatingNextRound)}
      rotatesRestingPlayers={rotatesRestingPlayers}
      isTournamentCompleted={session.isTournamentCompleted}
      isEditingCompletedTournament={session.isEditingCompletedTournament}
      allowEditAfterComplete={allowEditAfterComplete}
      canFinish={Boolean(session.canFinishNight)}
      linkCopied={linkCopied}
      onSubmitRoundScores={() => void actions.onSubmitRoundScores()}
      onGenerateNextRound={() => void actions.onGenerateNextRound?.()}
      onOpenFinishConfirm={actions.onOpenFinishConfirm}
      onSaveGameEdits={actions.onSaveGameEdits}
      onShare={() => void onCopyShareLink()}
      onViewLeaderboard={actions.onViewLeaderboard}
      onOpenLiveOptions={actions.onOpenLiveOptions}
    />
  );

  return (
    <Fragment>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: "row", gap: spacing.md, minHeight: 0 }}>
          <ScrollView style={{ width: sidebarWidth, flexShrink: 0 }} contentContainerStyle={scrollPad}>
            <View style={{ gap: spacing.md }}>
              {header}
              {actionBar}
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
          <LiveTournamentStickyActions>{actionBar}</LiveTournamentStickyActions>
        </View>
      )}
      <LiveTournamentSheets
        session={session}
        score={score}
        sheets={sheets}
        actions={actions}
        configRows={configRows}
        allowEditAfterComplete={allowEditAfterComplete}
        onCopyShareLink={() => void onCopyShareLink()}
        linkCopied={linkCopied}
      />
    </Fragment>
  );
}
