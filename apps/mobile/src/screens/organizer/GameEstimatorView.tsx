import { Button, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import type { Estimate } from "./types";

interface GameEstimatorViewProps {
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  usersText: string;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  estimate: Estimate | null;
  onChangeMode: (value: TournamentMode) => void;
  onChangeVariant: (value: TournamentVariant) => void;
  onChangeSchedulingMode: (value: SchedulingMode) => void;
  onChangeUsers: (value: string) => void;
  onChangeCourts: (value: string) => void;
  onChangePoints: (value: string) => void;
  onChangeTargetGames: (value: string) => void;
  onChangeTournamentTime: (value: string) => void;
  onBack: () => void;
}

export function GameEstimatorView(props: GameEstimatorViewProps) {
  const renderChoice = (label: string, active: boolean, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ borderWidth: 1, borderColor: active ? "#0a7" : "#999", backgroundColor: active ? "#d9fff3" : "#fff", padding: 10 }}>
      <Text>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Game Estimator</Text>
      <Text>Format</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {renderChoice("Americano", props.mode === "AMERICANO", () => props.onChangeMode("AMERICANO"))}
        {renderChoice("Mexicano", props.mode === "MEXICANO", () => props.onChangeMode("MEXICANO"))}
      </View>

      <Text>Type of game</Text>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {renderChoice("Classic", props.variant === "CLASSIC", () => props.onChangeVariant("CLASSIC"))}
        {renderChoice("Mixed", props.variant === "MIXED", () => props.onChangeVariant("MIXED"))}
        {renderChoice("Team", props.variant === "TEAM", () => props.onChangeVariant("TEAM"))}
      </View>

      <Text>Options</Text>
      {props.mode === "AMERICANO" ? (
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {renderChoice("Games Per Player", props.schedulingMode === "TARGET_GAMES", () => props.onChangeSchedulingMode("TARGET_GAMES"))}
          {renderChoice("Total Time", props.schedulingMode === "TOTAL_TIME", () => props.onChangeSchedulingMode("TOTAL_TIME"))}
          {renderChoice("Round Robin", props.schedulingMode === "ROUND_ROBIN", () => props.onChangeSchedulingMode("ROUND_ROBIN"))}
        </View>
      ) : (
        <Text>Mexicano uses Total Time scheduling.</Text>
      )}

      <Text>Number of users</Text>
      <TextInput value={props.usersText} onChangeText={props.onChangeUsers} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />

      <Text>Courts</Text>
      <TextInput value={props.courtsText} onChangeText={props.onChangeCourts} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />

      <Text>Points per match</Text>
      <TextInput value={props.pointsText} onChangeText={props.onChangePoints} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />

      {props.schedulingMode === "TARGET_GAMES" ? (
        <>
          <Text>Target games per player</Text>
          <TextInput value={props.targetGamesText} onChangeText={props.onChangeTargetGames} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />
        </>
      ) : null}

      {props.schedulingMode === "TOTAL_TIME" ? (
        <>
          <Text>Total tournament time (minutes)</Text>
          <TextInput
            value={props.tournamentTimeText}
            onChangeText={props.onChangeTournamentTime}
            keyboardType="numeric"
            style={{ borderWidth: 1, padding: 8 }}
          />
        </>
      ) : null}

      <View style={{ borderWidth: 1, padding: 10, gap: 4 }}>
        <Text style={{ fontWeight: "700" }}>Estimated Duration</Text>
        {props.estimate ? (
          <>
            <Text>Rounds: {props.estimate.rounds}</Text>
            <Text>Approx games per player: {props.estimate.gamesPerPlayer}</Text>
            <Text>Estimated total time: {props.estimate.durationMinutes} minutes</Text>
          </>
        ) : (
          <Text>Enter valid values to see estimate.</Text>
        )}
      </View>

      <Button title="Back" onPress={props.onBack} />
    </ScrollView>
  );
}
