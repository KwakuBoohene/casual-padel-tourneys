import { Pressable, Text, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { formatTournamentMode } from "../formatLabels";

import { WizardChrome } from "./WizardChrome";

interface TournamentOptionsStepViewProps {
  mode: TournamentMode;
  modeLocked: boolean;
  modeLabel: string;
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

  const renderOption = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: touch.minSecondary,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? "rgba(173,255,47,0.16)" : colors.surface,
        justifyContent: "center"
      }}
    >
      <Text style={{ color: colors.text, fontWeight: active ? "700" : "600", fontSize: 16 }}>{label}</Text>
    </Pressable>
  );

  return (
    <WizardChrome
      modeLabel={props.modeLabel}
      stepIndex={2}
      stepCount={4}
      title="Choose variant"
      subtitle={
        props.modeLocked
          ? `Mode already set · ${formatTournamentMode(props.mode)}`
          : undefined
      }
      primaryLabel="Next"
      onPrimary={props.onNext}
      onBack={props.onBack}
    >
      <View style={{ gap: spacing.sm }}>
        {!props.modeLocked ? (
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Mode</Text>
            {renderOption("Americano", props.mode === "AMERICANO", () => props.onChangeMode("AMERICANO"))}
            {renderOption("Mexicano", props.mode === "MEXICANO", () => props.onChangeMode("MEXICANO"))}
          </View>
        ) : null}
        {renderOption("Classic", props.variant === "CLASSIC", () => props.onChangeVariant("CLASSIC"))}
        {renderOption("Mixed", props.variant === "MIXED", () => props.onChangeVariant("MIXED"))}
      </View>

      {props.mode !== "MEXICANO" ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Scheduling</Text>
          {renderOption(
            "Target Games",
            props.schedulingMode === "TARGET_GAMES",
            () => props.onChangeSchedulingMode("TARGET_GAMES")
          )}
          {renderOption(
            "Total Time",
            props.schedulingMode === "TOTAL_TIME",
            () => props.onChangeSchedulingMode("TOTAL_TIME")
          )}
        </View>
      ) : null}
    </WizardChrome>
  );
}
