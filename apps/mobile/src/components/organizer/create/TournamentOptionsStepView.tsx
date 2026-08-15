import { Pressable, Text, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { formatTournamentMode } from "../../../utilities/organizer/formatLabels";

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
  const isMexicano = props.mode === "MEXICANO";

  const renderOption = (label: string, detail: string | undefined, active: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: touch.minSecondary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? "rgba(173,255,47,0.16)" : colors.surface,
        justifyContent: "center",
        gap: 2
      }}
    >
      <Text style={{ color: colors.text, fontWeight: active ? "700" : "600", fontSize: 16 }}>{label}</Text>
      {detail ? <Text style={{ color: colors.muted, fontSize: 12 }}>{detail}</Text> : null}
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
            {renderOption("Americano", undefined, props.mode === "AMERICANO", () => props.onChangeMode("AMERICANO"))}
            {renderOption("Mexicano", undefined, isMexicano, () => props.onChangeMode("MEXICANO"))}
          </View>
        ) : null}
        {isMexicano ? (
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: spacing.sm }}>
            {props.variant === "TEAM"
              ? "Round 1 shuffles fixed pairs. Later rounds: strongest teams face strongest (1 vs 2, 3 vs 4)."
              : "Round 1 is a lottery. After that, each next round is built from the leaderboard (1+3 vs 2+4)."}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Variant</Text>
        {renderOption(
          "Classic",
          isMexicano ? "Individuals ranked by points" : "Rotate partners each round",
          props.variant === "CLASSIC",
          () => props.onChangeVariant("CLASSIC")
        )}
        {renderOption(
          "Mixed",
          isMexicano
            ? "Same ladder · each side is one man + one woman"
            : "Each side is one man + one woman",
          props.variant === "MIXED",
          () => props.onChangeVariant("MIXED")
        )}
        {isMexicano
          ? renderOption(
              "Team",
              "Fixed pairs ranked · 1 vs 2, 3 vs 4",
              props.variant === "TEAM",
              () => props.onChangeVariant("TEAM")
            )
          : null}
      </View>

      {!isMexicano ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Scheduling</Text>
          {renderOption(
            "Target Games",
            "Stop after each player hits a game count",
            props.schedulingMode === "TARGET_GAMES",
            () => props.onChangeSchedulingMode("TARGET_GAMES")
          )}
          {renderOption(
            "Total Time",
            "Fill as many rounds as fit the clock",
            props.schedulingMode === "TOTAL_TIME",
            () => props.onChangeSchedulingMode("TOTAL_TIME")
          )}
          {renderOption(
            "Regular",
            props.variant === "TEAM"
              ? "Every team plays every team — no target games"
              : "Everyone plays everyone — no target games",
            props.schedulingMode === "ROUND_ROBIN",
            () => props.onChangeSchedulingMode("ROUND_ROBIN")
          )}
        </View>
      ) : null}
    </WizardChrome>
  );
}
