import { Button, ScrollView, Text, TextInput, View } from "react-native";
import type { TournamentMode, TournamentVariant } from "@padel/shared";

import type { Estimate } from "./types";

interface RulesStepViewProps {
  mode: TournamentMode;
  variant: TournamentVariant;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  estimate: Estimate | null;
  responseText: string;
  errorText: string;
  onChangeMode: (value: TournamentMode) => void;
  onChangeVariant: (value: TournamentVariant) => void;
  onChangeCourts: (value: string) => void;
  onChangePoints: (value: string) => void;
  onChangeTargetGames: (value: string) => void;
  onChangeTournamentTime: (value: string) => void;
  onBack: () => void;
  onCreate: () => void;
}

export function RulesStepView(props: RulesStepViewProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Tournament Rules</Text>
      <Text>Mode</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Americano" onPress={() => props.onChangeMode("AMERICANO")} />
        <Button title="Mexicano" onPress={() => props.onChangeMode("MEXICANO")} />
      </View>

      <Text>Variant</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Classic" onPress={() => props.onChangeVariant("CLASSIC")} />
        <Button title="Mixed" onPress={() => props.onChangeVariant("MIXED")} />
        <Button title="Team" onPress={() => props.onChangeVariant("TEAM")} />
      </View>

      <Text>Courts</Text>
      <TextInput value={props.courtsText} onChangeText={props.onChangeCourts} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />
      <Text>Points Per Match</Text>
      <TextInput value={props.pointsText} onChangeText={props.onChangePoints} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />

      {props.mode === "AMERICANO" ? (
        <>
          <Text>Target Games Per Player</Text>
          <TextInput value={props.targetGamesText} onChangeText={props.onChangeTargetGames} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />
        </>
      ) : (
        <>
          <Text>Tournament Time (minutes)</Text>
          <TextInput
            value={props.tournamentTimeText}
            onChangeText={props.onChangeTournamentTime}
            keyboardType="numeric"
            style={{ borderWidth: 1, padding: 8 }}
          />
        </>
      )}

      <View style={{ borderWidth: 1, padding: 10, gap: 4 }}>
        <Text style={{ fontWeight: "700" }}>Estimated Duration</Text>
        {props.estimate ? (
          <>
            <Text>Rounds: {props.estimate.rounds}</Text>
            <Text>Approx games per player: {props.estimate.gamesPerPlayer}</Text>
            <Text>Estimated total time: {props.estimate.durationMinutes} minutes</Text>
          </>
        ) : (
          <Text>Fill in valid numeric values to see the estimate.</Text>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Back" onPress={props.onBack} />
        <Button title="Create Tournament" onPress={props.onCreate} />
      </View>
      <View>
        <Text>{props.responseText}</Text>
        {props.errorText ? <Text style={{ color: "red" }}>Error: {props.errorText}</Text> : null}
      </View>
    </ScrollView>
  );
}
