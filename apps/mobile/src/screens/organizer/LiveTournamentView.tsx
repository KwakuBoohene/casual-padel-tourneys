import { Button, Modal, ScrollView, Text, TextInput, View } from "react-native";

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
  showAdjustCourtsConfirmModal: boolean;
  tournamentNameDraft: string;
  roundsLeft: number;
  estimatedMinutesLeft: number;
  currentCourts: number;
  proposedCourts: number;
  maxCourts: number;
  canAdjustCourts: boolean;
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
  onOpenAdjustCourtsConfirm: () => void;
  onCloseAdjustCourtsConfirm: () => void;
  onConfirmAdjustCourts: () => void;
  onSaveGameEdits: () => void;
  onUpdateScoreInput: (matchId: string, side: "scoreA" | "scoreB", value: string) => void;
  onSubmitMatchScore: (matchId: string) => void;
}

export function LiveTournamentView(props: LiveTournamentViewProps) {
  const canEditScores = !props.isTournamentCompleted || props.isEditingCompletedTournament;
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Live Tournament</Text>
      <Button title="Back To Tournament List" onPress={props.onBackToList} />
      <Button title="View Leaderboard" onPress={props.onViewLeaderboard} />
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
      {props.canAdjustCourts ? (
        <View style={{ borderWidth: 1, padding: 10, gap: 8 }}>
          <Text style={{ fontWeight: "700" }}>Adjust Courts</Text>
          <Text>Current courts: {props.currentCourts}</Text>
          <Text>Proposed courts: {props.proposedCourts}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title="-" onPress={() => props.onChangeProposedCourts(Math.max(props.currentCourts + 1, props.proposedCourts - 1))} />
            <Button title="+" onPress={() => props.onChangeProposedCourts(Math.min(props.maxCourts, props.proposedCourts + 1))} />
          </View>
          <Button title="Add/Adjust Courts" onPress={props.onOpenAdjustCourtsConfirm} />
        </View>
      ) : null}

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
                  onChangeText={(value) => props.onUpdateScoreInput(match.id, "scoreA", value)}
                  style={{ borderWidth: 1, padding: 8, flex: 1 }}
                />
                <TextInput
                  placeholder="Team B"
                  keyboardType="numeric"
                  value={props.scoreInputs[match.id]?.scoreB ?? (match.scoreB?.toString() ?? "")}
                  onChangeText={(value) => props.onUpdateScoreInput(match.id, "scoreB", value)}
                  style={{ borderWidth: 1, padding: 8, flex: 1 }}
                />
              </View>
              <Button title={match.completed ? "Update Score" : "Submit Score"} onPress={() => props.onSubmitMatchScore(match.id)} />
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

      {props.errorText ? <Text style={{ color: "red" }}>Error: {props.errorText}</Text> : null}
    </ScrollView>
  );
}
