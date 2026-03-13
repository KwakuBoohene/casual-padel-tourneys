import { Pressable, ScrollView, Text, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { colors, radius, spacing, typography } from "../../../theme";

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

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Mode</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {renderChoice(
            "Americano",
            props.mode === "AMERICANO",
            () => props.onChangeMode("AMERICANO")
          )}
          {renderChoice(
            "Mexicano",
            props.mode === "MEXICANO",
            () => props.onChangeMode("MEXICANO")
          )}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Variant</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {renderChoice(
            "Classic",
            props.variant === "CLASSIC",
            () => props.onChangeVariant("CLASSIC")
          )}
          {renderChoice(
            "Mixed",
            props.variant === "MIXED",
            () => props.onChangeVariant("MIXED")
          )}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Scheduling</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {renderChoice(
            "Target Games",
            props.schedulingMode === "TARGET_GAMES",
            () => props.onChangeSchedulingMode("TARGET_GAMES")
          )}
          {renderChoice(
            "Total Time",
            props.schedulingMode === "TOTAL_TIME",
            () => props.onChangeSchedulingMode("TOTAL_TIME")
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
        <Pressable
          onPress={props.onBack}
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
          <Text style={{ color: colors.text, fontWeight: "600" }}>Back</Text>
        </Pressable>
        <Pressable
          onPress={props.onNext}
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
            Next
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

