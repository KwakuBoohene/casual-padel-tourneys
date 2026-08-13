import * as Clipboard from "expo-clipboard";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { PlayerGender } from "@padel/shared";

import { AlertSheet, BottomSheet, SheetButton } from "../../../components/sheets";
import { layoutTokens, useBreakpoint } from "../../../layout";
import { radius, spacing, touch, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../types";

import { LiveTournamentMatchCard } from "./LiveTournamentMatchCard";

interface LiveTournamentViewProps {
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
  scoreInputs: Record<string, { scoreA: string; scoreB: string }>;
  playerNameById: Map<string, string>;
  showEditConfirmModal: boolean;
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
  // pending players
  showAddPendingPlayerModal: boolean;
  pendingPlayerNameDraft: string;
  pendingPlayerGender: PlayerGender | undefined;
  showIntegrateConfirmModal: boolean;
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

export function LiveTournamentView(props: LiveTournamentViewProps) {
  const { colors, cardStyles } = useTheme();

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
  const canGoPrev = props.selectedRoundIndex > 0;
  const canGoNext = props.selectedRoundIndex < roundsCount - 1 && roundsCount > 0;

  useEffect(() => {
    if (!props.focusSubmitMatchId) {
      return;
    }
    props.onSubmitFocusHandled();
  }, [props.focusSubmitMatchId, props.onSubmitFocusHandled]);

  const scrollPad = { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background };

  const mainColumn = (
    <>
      <Text style={[typography.title, { color: colors.text }]}>Live Tournament</Text>
      <Pressable
        onPress={props.onBackToList}
        style={{
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Back To Tournament List</Text>
      </Pressable>
      <Pressable
        onPress={props.onViewLeaderboard}
        style={{
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text
          style={{
            color: "colors.onPrimary",
            fontWeight: "700"
          }}
        >
          View Leaderboard
        </Text>
      </Pressable>
      <Pressable
        onPress={props.onOpenLiveOptions}
        style={{
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Options</Text>
      </Pressable>
      {props.isEditingCompletedTournament ? (
        <>
          <Text>Edit Tournament Name</Text>
          <TextInput
            value={props.tournamentNameDraft}
            onChangeText={props.onChangeTournamentName}
            style={{ borderWidth: 1, padding: 8 }}
          />
          <Pressable
            onPress={props.onSaveTournamentName}
            style={{
              marginTop: spacing.sm,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text
              style={{
                color: "colors.onPrimary",
                fontWeight: "700"
              }}
            >
              Save Tournament Name
            </Text>
          </Pressable>
        </>
      ) : (
        <Text>
          {props.tournament.config.name} ({props.tournament.config.mode}/{props.tournament.config.variant})
        </Text>
      )}
      <Text style={{ color: colors.muted }}>Current Version: {props.tournament.version}</Text>
      <Text style={{ color: colors.muted }}>Rounds Left: {props.roundsLeft}</Text>
      <Text style={{ color: colors.muted }}>Estimated Time Left: {props.estimatedMinutesLeft} minutes</Text>
      <Pressable
        onPress={props.onRefresh}
        style={{
          marginTop: spacing.sm,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Refresh</Text>
      </Pressable>

      {/* Pending Players Section */}
      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.label, { color: colors.muted, textTransform: "uppercase" }]}>
          Waiting Players
        </Text>
        {props.tournament.pendingPlayers.length === 0 ? (
          <Text style={{ color: colors.muted }}>No players in queue</Text>
        ) : (
          <View style={[cardStyles.container, { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }]}>
            {props.tournament.pendingPlayers.map((player) => (
              <View
                key={player.id}
                style={{
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border
                }}
              >
                <Text style={{ color: colors.text, fontSize: 12 }}>{player.name}</Text>
              </View>
            ))}
          </View>
        )}
        <Pressable
          onPress={props.onOpenAddPendingPlayer}
          style={{
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Add Player to Queue</Text>
        </Pressable>
        {props.tournament.pendingPlayers.length > 0 ? (
          <Pressable
            onPress={props.onOpenIntegrateConfirm}
            style={{
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: "colors.onPrimary", fontWeight: "700" }}>Integrate Waiting Players</Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm
        }}
      >
        <Text style={[typography.sectionTitle, { color: colors.text, flex: 1 }]}>
          {props.displayedRound ? `Round ${props.displayedRound.roundNumber}` : "No round"}
        </Text>
        {roundsCount > 1 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Pressable
              onPress={props.onPrevRound}
              disabled={!canGoPrev}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: canGoPrev ? colors.surface : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: canGoPrev ? 1 : 0.6
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>← Prev</Text>
            </Pressable>
            <Text style={{ color: colors.muted, fontSize: 12, minWidth: 48, textAlign: "center" }}>
              {props.selectedRoundIndex + 1} / {roundsCount}
            </Text>
            <Pressable
              onPress={props.onNextRound}
              disabled={!canGoNext}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: canGoNext ? colors.surface : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: canGoNext ? 1 : 0.6
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>Next →</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {props.isTournamentCompleted ? (
        <Text style={{ fontWeight: "700", color: colors.primary }}>Tournament Completed</Text>
      ) : null}
      {props.activeRound && props.isLastRound ? (
        <Pressable
          onPress={props.onFinishTournament}
          style={{
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text
            style={{
              color: "colors.onPrimary",
              fontWeight: "700"
            }}
          >
            Finish Tournament
          </Text>
        </Pressable>
      ) : null}
      {props.isTournamentCompleted && !props.isEditingCompletedTournament ? (
        <Pressable
          onPress={props.onOpenEditConfirm}
          style={{
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Edit Game</Text>
        </Pressable>
      ) : null}
      {props.isTournamentCompleted && props.isEditingCompletedTournament ? (
        <Pressable
          onPress={props.onSaveGameEdits}
          style={{
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text
            style={{
              color: "colors.onPrimary",
              fontWeight: "700"
            }}
          >
            Save Game Edits
          </Text>
        </Pressable>
      ) : null}
    </>
  );

  const matchesBlock = (
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
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text
            style={{
              color: "colors.onPrimary",
              fontWeight: "700"
            }}
          >
            Submit round scores
          </Text>
        </Pressable>
      ) : null}
    </>
  );

  const shareBlock = (
    <>
      <View
        style={{
          marginTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.sm,
          gap: 4
        }}
      >
        <Text style={{ fontWeight: "700", color: colors.text }}>Shareable Link</Text>
        <Pressable
          onPress={onCopyShareLink}
          accessibilityRole="button"
          accessibilityLabel="Copy shareable tournament link"
          accessibilityHint="Copies the viewer link to your clipboard"
        >
          <Text style={{ color: linkCopied ? colors.primary : colors.muted }}>{shareUrl}</Text>
          {linkCopied ? (
            <Text style={{ marginTop: 4, fontSize: 12, color: colors.primary }}>Copied to clipboard</Text>
          ) : (
            <Text style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>
              Tap to copy
            </Text>
          )}
        </Pressable>
      </View>
    </>
  );

  return (
    <Fragment>
      {isWide ? (
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            gap: spacing.md,
            minHeight: 0
          }}
        >
          <ScrollView
            style={{ width: sidebarWidth, flexShrink: 0 }}
            contentContainerStyle={scrollPad}
            keyboardShouldPersistTaps="handled"
          >
            {mainColumn}
            {shareBlock}
          </ScrollView>
          <ScrollView
            style={{ flex: 1, minWidth: 0 }}
            contentContainerStyle={scrollPad}
            keyboardShouldPersistTaps="handled"
          >
            {matchesBlock}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={scrollPad} keyboardShouldPersistTaps="handled">
          {mainColumn}
          {matchesBlock}
          {shareBlock}
        </ScrollView>
      )}

      <AlertSheet
        visible={props.showEditConfirmModal}
        variant="warning"
        title="Edit Completed Tournament?"
        message="Are you sure you want to unlock this tournament and edit round scores?"
        primaryAction={{ label: "Yes, Edit Game", onPress: props.onConfirmEditGame }}
        secondaryAction={{ label: "Cancel", onPress: props.onCloseEditConfirm }}
        onDismiss={props.onCloseEditConfirm}
      />

      <AlertSheet
        visible={props.showAdjustCourtsConfirmModal}
        variant="warning"
        title="Adjust Courts?"
        message={`Are you sure you want to change courts from ${props.currentCourts} to ${props.proposedCourts}? Remaining rounds will be recalculated.`}
        primaryAction={{ label: "Yes, Reassign Games", onPress: props.onConfirmAdjustCourts }}
        secondaryAction={{ label: "Cancel", onPress: props.onCloseAdjustCourtsConfirm }}
        onDismiss={props.onCloseAdjustCourtsConfirm}
      />

      <BottomSheet
        visible={props.showLiveOptionsModal}
        title="Live Options"
        onDismiss={props.onCloseLiveOptions}
      >
        {props.canAdjustCourts ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontWeight: "700", color: colors.text }}>Adjust Courts</Text>
            <Text style={{ color: colors.muted }}>Current courts: {props.currentCourts}</Text>
            <Text style={{ color: colors.muted }}>Proposed courts: {props.proposedCourts}</Text>
            <Text style={{ color: colors.muted }}>Allowed range: 1 - {props.maxCourts}</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <SheetButton
                label="-"
                style={{ flex: 1 }}
                disabled={props.proposedCourts <= 1}
                onPress={() => props.onChangeProposedCourts(Math.max(1, props.proposedCourts - 1))}
              />
              <SheetButton
                label="+"
                style={{ flex: 1 }}
                disabled={props.proposedCourts >= props.maxCourts}
                onPress={() =>
                  props.onChangeProposedCourts(Math.min(props.maxCourts, props.proposedCourts + 1))
                }
              />
            </View>
            <SheetButton label="Apply Court Change" variant="primary" onPress={props.onOpenAdjustCourtsConfirm} />
          </View>
        ) : (
          <Text style={{ color: colors.muted }}>No court adjustment options available right now.</Text>
        )}
        <SheetButton label="Close" onPress={props.onCloseLiveOptions} />
      </BottomSheet>

      <BottomSheet
        visible={Boolean(props.scorePicker)}
        title="Select Score"
        onDismiss={props.onCloseScorePicker}
      >
        <Text style={{ color: colors.muted }}>
          Possible scores (1 to {props.tournament.config.pointsPerMatch})
        </Text>
        <ScrollView
          style={{ maxHeight: 180 }}
          contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
        >
          {Array.from({ length: props.tournament.config.pointsPerMatch }, (_, index) => index + 1).map(
            (score) => (
              <Pressable
                key={`score-${score}`}
                onPress={() => props.onSelectScoreFromPicker(score)}
                style={{
                  minWidth: touch.minSecondary,
                  minHeight: touch.minSecondary,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>{score}</Text>
              </Pressable>
            )
          )}
        </ScrollView>
        <SheetButton
          label="Reset"
          onPress={() => {
            if (props.scorePicker) {
              props.onResetScoreForMatch(props.scorePicker.matchId);
              props.onCloseScorePicker();
            }
          }}
        />
        <SheetButton label="Close" variant="primary" onPress={props.onCloseScorePicker} />
      </BottomSheet>

      <BottomSheet
        visible={props.showAddPendingPlayerModal}
        title="Add Player to Queue"
        onDismiss={props.onCloseAddPendingPlayer}
      >
        <TextInput
          placeholder="Player name"
          value={props.pendingPlayerNameDraft}
          onChangeText={props.onChangePendingPlayerName}
          placeholderTextColor={colors.muted}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.sm,
            minHeight: touch.minSecondary,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            color: colors.text
          }}
        />
        {props.tournament.config.variant === "MIXED" ? (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {(["MALE", "FEMALE"] as const).map((gender) => (
              <SheetButton
                key={gender}
                label={gender === "MALE" ? "M" : "F"}
                variant={props.pendingPlayerGender === gender ? "primary" : "secondary"}
                style={{ flex: 1 }}
                onPress={() => props.onChangePendingPlayerGender(gender)}
              />
            ))}
          </View>
        ) : null}
        {props.errorText ? (
          <Text style={{ color: colors.danger, fontSize: 12 }}>{props.errorText}</Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <SheetButton label="Cancel" style={{ flex: 1 }} onPress={props.onCloseAddPendingPlayer} />
          <SheetButton
            label="Add Player"
            variant="primary"
            style={{ flex: 1 }}
            disabled={!props.pendingPlayerNameDraft.trim()}
            onPress={props.onSubmitAddPendingPlayer}
          />
        </View>
      </BottomSheet>

      <AlertSheet
        visible={props.showIntegrateConfirmModal}
        variant="info"
        title="Integrate Players?"
        message={`Integrate ${props.tournament.pendingPlayers.length} waiting player${
          props.tournament.pendingPlayers.length !== 1 ? "s" : ""
        } into the tournament?`}
        primaryAction={{ label: "Confirm", onPress: props.onConfirmIntegratePendingPlayers }}
        secondaryAction={{ label: "Cancel", onPress: props.onCloseIntegrateConfirm }}
        onDismiss={props.onCloseIntegrateConfirm}
      />

      {props.errorText ? <Text style={{ color: colors.danger }}>Error: {props.errorText}</Text> : null}
    </Fragment>
  );
}
