import { Pressable, ScrollView, Text, View, Button } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

interface TournamentOptionsStepViewProps {
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  onChangeMode: (value: TournamentMode) => void;
  onChangeVariant: (value: TournamentVariant) => void;
  onChangeSchedulingMode: (value: SchedulingMode) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TournamentOptionsStepView(props: TournamentOptionsStepViewProps) {
  const renderChoice = (label: string, active: boolean, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ borderWidth: 1, borderColor: active ? "#0a7" : "#999", backgroundColor: active ? "#d9fff3" : "#fff", padding: 10 }}>
      <Text>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Tournament Options</Text>

      <Text>Mode</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {renderChoice("Americano", props.mode === "AMERICANO", () => props.onChangeMode("AMERICANO"))}
        {renderChoice("Mexicano", props.mode === "MEXICANO", () => props.onChangeMode("MEXICANO"))}
      </View>

      <Text>Variant</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {renderChoice("Classic", props.variant === "CLASSIC", () => props.onChangeVariant("CLASSIC"))}
        {renderChoice("Mixed", props.variant === "MIXED", () => props.onChangeVariant("MIXED"))}
        {renderChoice("Team", props.variant === "TEAM", () => props.onChangeVariant("TEAM"))}
      </View>

      <Text>Scheduling</Text>
      {props.mode === "AMERICANO" ? (
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {renderChoice("Games Per Player", props.schedulingMode === "TARGET_GAMES", () => props.onChangeSchedulingMode("TARGET_GAMES"))}
          {renderChoice("Total Time", props.schedulingMode === "TOTAL_TIME", () => props.onChangeSchedulingMode("TOTAL_TIME"))}
          {renderChoice("Round Robin", props.schedulingMode === "ROUND_ROBIN", () => props.onChangeSchedulingMode("ROUND_ROBIN"))}
        </View>
      ) : (
        <Text>Mexicano uses Total Time scheduling.</Text>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Back" onPress={props.onBack} />
        <Button title="Next" onPress={props.onNext} />
      </View>
    </ScrollView>
  );
}
