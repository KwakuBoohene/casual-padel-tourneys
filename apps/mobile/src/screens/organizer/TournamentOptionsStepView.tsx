import { Button, Pressable, ScrollView, Text, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { colors, radius, spacing, typography } from "../../theme";

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
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? "rgba(173,255,47,0.16)" : colors.surface
      }}
    >
      <Text style={{ color: colors.text, fontWeight: active ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Text style={[typography.title, { color: colors.text }]}>Tournament Options</Text>

      <Text style={{ color: colors.muted }}>Mode</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {renderChoice("Americano", props.mode === "AMERICANO", () => props.onChangeMode("AMERICANO"))}
        {renderChoice("Mexicano", props.mode === "MEXICANO", () => props.onChangeMode("MEXICANO"))}
      </View>

      <Text style={{ color: colors.muted }}>Variant</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {renderChoice("Classic", props.variant === "CLASSIC", () => props.onChangeVariant("CLASSIC"))}
        {renderChoice("Mixed", props.variant === "MIXED", () => props.onChangeVariant("MIXED"))}
        {renderChoice("Team", props.variant === "TEAM", () => props.onChangeVariant("TEAM"))}
      </View>

      <Text style={{ color: colors.muted }}>Scheduling</Text>
      {props.mode === "AMERICANO" ? (
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {renderChoice("Games Per Player", props.schedulingMode === "TARGET_GAMES", () => props.onChangeSchedulingMode("TARGET_GAMES"))}
          {renderChoice("Total Time", props.schedulingMode === "TOTAL_TIME", () => props.onChangeSchedulingMode("TOTAL_TIME"))}
          {renderChoice("Round Robin", props.schedulingMode === "ROUND_ROBIN", () => props.onChangeSchedulingMode("ROUND_ROBIN"))}
        </View>
      ) : (
        <Text style={{ color: colors.muted }}>Mexicano uses Total Time scheduling.</Text>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Back" onPress={props.onBack} />
        <Button title="Next" onPress={props.onNext} />
      </View>
    </ScrollView>
  );
}
