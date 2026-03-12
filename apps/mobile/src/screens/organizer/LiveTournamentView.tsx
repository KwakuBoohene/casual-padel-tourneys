import { useEffect, useRef } from "react";
import { Button, Modal, ScrollView, Text, TextInput, View } from "react-native";

import { cardStyles, colors, radius, spacing, typography } from "../../theme";

import type { LiveTournamentState } from "./types";

interface LiveTournamentViewProps {
  tournament: LiveTournamentState;
  viewerBaseUrl: string;
  errorText: string;
  activeRound: LiveTournamentState["rounds"][number] | null;
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
  onSubmitFocusHandled: () => void;
  onUpdateScoreInput: (matchId: string, side: "scoreA" | "scoreB", value: string) => void;
  onSubmitMatchScore: (matchId: string) => void;
}

export function LiveTournamentView(props: LiveTournamentViewProps) {
  const canEditScores = !props.isTournamentCompleted || props.isEditingCompletedTournament;
  const submitAnchorRefs = useRef<Record<string, { focus?: () => void } | null>>({});

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
      <Button title="Back To Tournament List" onPress={props.onBackToList} />
      <Button title="View Leaderboard" onPress={props.onViewLeaderboard} />
      <Button title="Options" onPress={props.onOpenLiveOptions} />
      {props.isEditingCompletedTournament ? (
        <>
          <Text>Edit Tournament Name</Text>
          <TextInput value={props.tournamentNameDraft} onChangeText={props.onChangeTournamentName} style={{ borderWidth: 1, padding: 8 }} />
          <Button title="Save Tournament Name" onPress={props.onSaveTournamentName} />
        </>
      ) : (
        <Text>
          {props.tournament.config.name} ({props.tournament.config.mode}/{props.tournament.config.variant})
        </Text>
      )}
      <Text>Current Version: {props.tournament.version}</Text>
      <Text>Rounds Left: {props.roundsLeft}</Text>
      <Text>Estimated Time Left: {props.estimatedMinutesLeft} minutes</Text>
      <Button title="Refresh" onPress={props.onRefresh} />

      <Text style={{ fontSize: 18, fontWeight: "700" }}>{props.activeRound ? `Round ${props.activeRound.roundNumber}` : "No active round"}</Text>
      {props.isTournamentCompleted ? <Text style={{ fontWeight: "700" }}>Tournament Completed</Text> : null}
      {props.isLastRound ? <Button title="Finish Tournament" onPress={props.onFinishTournament} /> : null}
      {props.isTournamentCompleted && !props.isEditingCompletedTournament ? <Button title="Edit Game" onPress={props.onOpenEditConfirm} /> : null}
      {props.isTournamentCompleted && props.isEditingCompletedTournament ? <Button title="Save Game Edits" onPress={props.onSaveGameEdits} /> : null}

      {(props.activeRound?.matches ?? []).map((match) => (
        <View key={match.id} style={{ borderWidth: 1, padding: 10, gap: 8 }}>
          <Text style={{ fontWeight: "700" }}>Court {match.court}</Text>
          <Text>
            {props.playerNameById.get(match.teamA[0]) ?? match.teamA[0]} / {props.playerNameById.get(match.teamA[1]) ?? match.teamA[1]}
          </Text>
          <Text>
            vs {props.playerNameById.get(match.teamB[0]) ?? match.teamB[0]} / {props.playerNameById.get(match.teamB[1]) ?? match.teamB[1]}
          </Text>
          {canEditScores ? (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  placeholder="Team A"
                  keyboardType="numeric"
                  value={props.scoreInputs[match.id]?.scoreA ?? (match.scoreA?.toString() ?? "")}
                  onFocus={() => props.onOpenScorePicker(match.id, "scoreA")}
                  onChangeText={(value) => props.onUpdateScoreInput(match.id, "scoreA", value)}
                  style={{ borderWidth: 1, padding: 8, flex: 1 }}
                />
                <TextInput
                  placeholder="Team B"
                  keyboardType="numeric"
                  value={props.scoreInputs[match.id]?.scoreB ?? (match.scoreB?.toString() ?? "")}
                  onFocus={() => props.onOpenScorePicker(match.id, "scoreB")}
                  onChangeText={(value) => props.onUpdateScoreInput(match.id, "scoreB", value)}
                  style={{ borderWidth: 1, padding: 8, flex: 1 }}
                />
              </View>
              <View
                ref={(node) => {
                  submitAnchorRefs.current[match.id] = node;
                }}
              >
                <Button title={match.completed ? "Update Score" : "Submit Score"} onPress={() => props.onSubmitMatchScore(match.id)} />
              </View>
            </>
          ) : (
            <Text>
              Final Score: {match.scoreA ?? "-"} - {match.scoreB ?? "-"}
            </Text>
          )}
        </View>
      ))}

      <View style={{ marginTop: 10, borderTopWidth: 1, paddingTop: 10, gap: 4 }}>
        <Text style={{ fontWeight: "700" }}>Shareable Link</Text>
        <Text>{`${props.viewerBaseUrl}/tournament/${props.tournament.publicToken}`}</Text>
      </View>

      <Modal transparent visible={props.showEditConfirmModal} animationType="fade" onRequestClose={props.onCloseEditConfirm}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: "white", width: "100%", maxWidth: 420, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>Edit Completed Tournament?</Text>
            <Text>Are you sure you want to unlock this tournament and edit round scores?</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title="Cancel" onPress={props.onCloseEditConfirm} />
              <Button title="Yes, Edit Game" onPress={props.onConfirmEditGame} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={props.showAdjustCourtsConfirmModal} animationType="fade" onRequestClose={props.onCloseAdjustCourtsConfirm}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: "white", width: "100%", maxWidth: 420, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>Adjust Courts?</Text>
            <Text>
              Are you sure you want to change courts from {props.currentCourts} to {props.proposedCourts}? Remaining rounds will be recalculated.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title="Cancel" onPress={props.onCloseAdjustCourtsConfirm} />
              <Button title="Yes, Reassign Games" onPress={props.onConfirmAdjustCourts} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={props.showLiveOptionsModal} animationType="fade" onRequestClose={props.onCloseLiveOptions}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: "white", width: "100%", maxWidth: 420, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>Live Options</Text>
            {props.canAdjustCourts ? (
              <>
                <Text style={{ fontWeight: "700" }}>Adjust Courts</Text>
                <Text>Current courts: {props.currentCourts}</Text>
                <Text>Proposed courts: {props.proposedCourts}</Text>
                <Text>Allowed range: 1 - {props.maxCourts}</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Button
                    title="-"
                    disabled={props.proposedCourts <= 1}
                    onPress={() => props.onChangeProposedCourts(Math.max(1, props.proposedCourts - 1))}
                  />
                  <Button
                    title="+"
                    disabled={props.proposedCourts >= props.maxCourts}
                    onPress={() => props.onChangeProposedCourts(Math.min(props.maxCourts, props.proposedCourts + 1))}
                  />
                </View>
                <Button title="Apply Court Change" onPress={props.onOpenAdjustCourtsConfirm} />
              </>
            ) : (
              <Text>No court adjustment options available right now.</Text>
            )}
            <Button title="Close" onPress={props.onCloseLiveOptions} />
          </View>
        </View>
      </Modal>

      <Modal transparent visible={Boolean(props.scorePicker)} animationType="slide" onRequestClose={props.onCloseScorePicker}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" }}>
          <View style={{ backgroundColor: "white", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 10, maxHeight: "45%" }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>Select Score</Text>
            <Text>Possible scores (1 to {props.tournament.config.pointsPerMatch})</Text>
            <ScrollView contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Array.from({ length: props.tournament.config.pointsPerMatch }, (_, index) => index + 1).map((score) => (
                <Button key={`score-${score}`} title={`${score}`} onPress={() => props.onSelectScoreFromPicker(score)} />
              ))}
            </ScrollView>
            <Button title="Close" onPress={props.onCloseScorePicker} />
          </View>
        </View>
      </Modal>

      {props.errorText ? <Text style={{ color: "red" }}>Error: {props.errorText}</Text> : null}
    </ScrollView>
  );
}
