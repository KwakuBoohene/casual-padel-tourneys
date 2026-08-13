import { Pressable, ScrollView, Text, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { useBreakpoint } from "../../../layout";
import { radius, spacing, touch, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { formatTournamentMode } from "../formatLabels";

interface TournamentOptionsStepViewProps {
  mode: TournamentMode;
  modeLocked: boolean;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  onChangeMode: (value: TournamentMode) => void;
  onChangeVariant: (value: TournamentVariant) => void;
  onChangeSchedulingMode: (value: SchedulingMode) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TournamentOptionsStepView(props: TournamentOptionsStepViewProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();

  const renderChoice = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: touch.minSecondary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? "rgba(173,255,47,0.16)" : colors.surface,
        justifyContent: "center"
      }}
    >
      <Text style={{ color: colors.text, fontWeight: active ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.md,
        maxWidth: formMaxWidth,
        width: "100%",
        alignSelf: "center"
      }}
    >
      <Text style={[typography.title, { color: colors.text }]}>Tournament Options</Text>

      {props.modeLocked ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Mode</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
            {formatTournamentMode(props.mode)}
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Mode</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {renderChoice("Americano", props.mode === "AMERICANO", () => props.onChangeMode("AMERICANO"))}
            {renderChoice("Mexicano", props.mode === "MEXICANO", () => props.onChangeMode("MEXICANO"))}
          </View>
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Variant</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {renderChoice("Classic", props.variant === "CLASSIC", () => props.onChangeVariant("CLASSIC"))}
          {renderChoice("Mixed", props.variant === "MIXED", () => props.onChangeVariant("MIXED"))}
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
            minHeight: touch.minSecondary,
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
            minHeight: touch.minPrimary,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Next</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
