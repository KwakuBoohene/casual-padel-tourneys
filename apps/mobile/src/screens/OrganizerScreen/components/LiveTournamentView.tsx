import { useEffect, useRef } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { cardStyles, colors, radius, spacing, typography } from "../../../theme";
import type { LiveTournamentState } from "../types";

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
  const canEditScores = !props.isTournamentCompleted || props.isEditingCompletedTournament;
  const submitAnchorRefs = useRef<Record<string, { focus?: () => void } | null>>({});
  const roundsCount = props.sortedRounds.length;
  const canGoPrev = props.selectedRoundIndex > 0;
  const canGoNext = props.selectedRoundIndex < roundsCount - 1 && roundsCount > 0;

  useEffect(() => {
    if (!props.focusSubmitMatchId) {
      return;
    }
    const target = submitAnchorRefs.current[props.focusSubmitMatchId];
    target?.focus?.();
    props.onSubmitFocusHandled();
  }, [props.focusSubmitMatchId, props]);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background }}>
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
            color: "#020617",
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
          <TextInput value={props.tournamentNameDraft} onChangeText={props.onChangeTournamentName} style={{ borderWidth: 1, padding: 8 }} />
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
                color: "#020617",
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

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
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
      {props.isTournamentCompleted ? <Text style={{ fontWeight: "700", color: colors.primary }}>Tournament Completed</Text> : null}
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
              color: "#020617",
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
              color: "#020617",
              fontWeight: "700"
            }}
          >
            Save Game Edits
          </Text>
        </Pressable>
      ) : null}

      {(props.displayedRound?.matches ?? []).map((match) => (
        <View
          key={match.id}
          style={[
            cardStyles.container,
            {
              padding: spacing.md,
              gap: spacing.sm
            }
          ]}
        >
          <Text style={{ fontWeight: "700", color: colors.text }}>Court {match.court}</Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs }}>
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <Text style={{ fontSize: 10, color: colors.muted, textTransform: "uppercase" }}>Team A</Text>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {props.playerNameById.get(match.teamA[0]) ?? match.teamA[0]}
              </Text>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {props.playerNameById.get(match.teamA[1]) ?? match.teamA[1]}
              </Text>
            </View>

            <View style={{ width: 40, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.muted, fontWeight: "700" }}>vs</Text>
            </View>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 10, color: colors.muted, textTransform: "uppercase" }}>Team B</Text>
              <Text style={{ color: colors.text, fontWeight: "600", textAlign: "right" }}>
                {props.playerNameById.get(match.teamB[0]) ?? match.teamB[0]}
              </Text>
              <Text style={{ color: colors.text, fontWeight: "600", textAlign: "right" }}>
                {props.playerNameById.get(match.teamB[1]) ?? match.teamB[1]}
              </Text>
            </View>
          </View>
          {canEditScores ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                placeholder="Team A"
                keyboardType="numeric"
                value={props.scoreInputs[match.id]?.scoreA ?? (match.scoreA?.toString() ?? "")}
                onFocus={() => props.onOpenScorePicker(match.id, "scoreA")}
                onChangeText={(value) => props.onUpdateScoreInput(match.id, "scoreA", value)}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.sm,
                  flex: 1,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  color: colors.text
                }}
                placeholderTextColor={colors.muted}
              />
              <TextInput
                placeholder="Team B"
                keyboardType="numeric"
                value={props.scoreInputs[match.id]?.scoreB ?? (match.scoreB?.toString() ?? "")}
                onFocus={() => props.onOpenScorePicker(match.id, "scoreB")}
                onChangeText={(value) => props.onUpdateScoreInput(match.id, "scoreB", value)}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.sm,
                  flex: 1,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  color: colors.text
                }}
                placeholderTextColor={colors.muted}
              />
            </View>
          ) : (
            <Text style={{ color: colors.text }}>
              Final Score: {match.scoreA ?? "-"} - {match.scoreB ?? "-"}
            </Text>
          )}
        </View>
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
              color: "#020617",
              fontWeight: "700"
            }}
          >
            Submit round scores
          </Text>
        </Pressable>
      ) : null}

      <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 4 }}>
        <Text style={{ fontWeight: "700", color: colors.text }}>Shareable Link</Text>
        <Text style={{ color: colors.muted }}>{`${props.viewerBaseUrl}/tournament/${props.tournament.publicToken}`}</Text>
      </View>

      <Modal transparent visible={props.showEditConfirmModal} animationType="fade" onRequestClose={props.onCloseEditConfirm}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              width: "100%",
              maxWidth: 420,
              padding: spacing.lg,
              gap: spacing.md,
              borderRadius: radius.lg
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Edit Completed Tournament?</Text>
            <Text style={{ color: colors.muted }}>
              Are you sure you want to unlock this tournament and edit round scores?
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={props.onCloseEditConfirm}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={props.onConfirmEditGame}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text
                  style={{
                    color: "#020617",
                    fontWeight: "700"
                  }}
                >
                  Yes, Edit Game
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={props.showAdjustCourtsConfirmModal} animationType="fade" onRequestClose={props.onCloseAdjustCourtsConfirm}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              width: "100%",
              maxWidth: 420,
              padding: spacing.lg,
              gap: spacing.md,
              borderRadius: radius.lg
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Adjust Courts?</Text>
            <Text style={{ color: colors.muted }}>
              Are you sure you want to change courts from {props.currentCourts} to {props.proposedCourts}? Remaining rounds will be
              recalculated.
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={props.onCloseAdjustCourtsConfirm}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={props.onConfirmAdjustCourts}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text
                  style={{
                    color: "#020617",
                    fontWeight: "700"
                  }}
                >
                  Yes, Reassign Games
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={props.showLiveOptionsModal} animationType="fade" onRequestClose={props.onCloseLiveOptions}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              width: "100%",
              maxWidth: 420,
              padding: spacing.lg,
              gap: spacing.md,
              borderRadius: radius.lg
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Live Options</Text>
            {props.canAdjustCourts ? (
              <>
                <Text style={{ fontWeight: "700", color: colors.text }}>Adjust Courts</Text>
                <Text style={{ color: colors.muted }}>Current courts: {props.currentCourts}</Text>
                <Text style={{ color: colors.muted }}>Proposed courts: {props.proposedCourts}</Text>
                <Text style={{ color: colors.muted }}>Allowed range: 1 - {props.maxCourts}</Text>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Pressable
                    onPress={() => props.onChangeProposedCourts(Math.max(1, props.proposedCourts - 1))}
                    disabled={props.proposedCourts <= 1}
                    style={{
                      flex: 1,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: props.proposedCourts <= 1 ? 0.4 : 1
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "700" }}>-</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => props.onChangeProposedCourts(Math.min(props.maxCourts, props.proposedCourts + 1))}
                    disabled={props.proposedCourts >= props.maxCourts}
                    style={{
                      flex: 1,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: props.proposedCourts >= props.maxCourts ? 0.4 : 1
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "700" }}>+</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={props.onOpenAdjustCourtsConfirm}
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
                      color: "#020617",
                      fontWeight: "700"
                    }}
                  >
                    Apply Court Change
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={{ color: colors.muted }}>No court adjustment options available right now.</Text>
            )}
            <Pressable
              onPress={props.onCloseLiveOptions}
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
              <Text style={{ color: colors.text, fontWeight: "600" }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={Boolean(props.scorePicker)} animationType="slide" onRequestClose={props.onCloseScorePicker}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" }}>
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              padding: spacing.lg,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              gap: spacing.md,
              maxHeight: "45%"
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Select Score</Text>
            <Text style={{ color: colors.muted }}>Possible scores (1 to {props.tournament.config.pointsPerMatch})</Text>
            <ScrollView contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {Array.from({ length: props.tournament.config.pointsPerMatch }, (_, index) => index + 1).map((score) => (
                <Pressable
                  key={`score-${score}`}
                  onPress={() => props.onSelectScoreFromPicker(score)}
                  style={{
                    minWidth: 40,
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
              ))}
            </ScrollView>
            <Pressable
              onPress={() => {
                if (props.scorePicker) {
                  props.onResetScoreForMatch(props.scorePicker.matchId);
                  props.onCloseScorePicker();
                }
              }}
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
              <Text style={{ color: colors.text, fontWeight: "600" }}>Reset</Text>
            </Pressable>
            <Pressable
              onPress={props.onCloseScorePicker}
              style={{
                marginTop: spacing.xs,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text
                style={{
                  color: "#020617",
                  fontWeight: "700"
                }}
              >
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {props.errorText ? <Text style={{ color: colors.danger }}>Error: {props.errorText}</Text> : null}
    </ScrollView>
  );
}

