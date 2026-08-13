import { Text, TextInput, View } from "react-native";
import type { SchedulingMode } from "@padel/shared";

import type { Estimate } from "../types";
import { radius, spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { WizardChrome } from "./WizardChrome";

interface MatchSettingsStepViewProps {
  modeLabel: string;
  schedulingMode: SchedulingMode;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  estimate: Estimate | null;
  responseText: string;
  errorText: string;
  playersCount: number;
  onChangeCourts: (value: string) => void;
  onChangePoints: (value: string) => void;
  onChangeTargetGames: (value: string) => void;
  onChangeTournamentTime: (value: string) => void;
  onBack: () => void;
  onCreate: () => void;
}

export function MatchSettingsStepView(props: MatchSettingsStepViewProps) {
  const { colors, cardStyles } = useTheme();
  const courts = Number(props.courtsText);
  const minPlayersForCourts = Number.isFinite(courts) && courts > 0 ? courts * 4 : 0;
  const hasEnoughPlayersForCourts =
    Number.isFinite(courts) && courts > 0 && props.playersCount >= minPlayersForCourts;

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          color: colors.text,
          fontSize: 16
        }}
      />
    </View>
  );

  return (
    <WizardChrome
      modeLabel={props.modeLabel}
      stepIndex={4}
      stepCount={4}
      title="Match settings"
      primaryLabel="Create Tournament"
      primaryDisabled={!hasEnoughPlayersForCourts}
      onPrimary={props.onCreate}
      onBack={props.onBack}
    >
      {field("Courts", props.courtsText, props.onChangeCourts, "Number of courts")}
      {!hasEnoughPlayersForCourts ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>
          You need at least {minPlayersForCourts || 4} players for {props.courtsText || "1"} court
          {courts === 1 ? "" : "s"}.
        </Text>
      ) : null}
      {field("Points per match", props.pointsText, props.onChangePoints, "Points per match")}
      {props.schedulingMode === "TARGET_GAMES"
        ? field("Target games per player", props.targetGamesText, props.onChangeTargetGames, "Target games")
        : null}
      {props.schedulingMode === "TOTAL_TIME"
        ? field("Tournament time (minutes)", props.tournamentTimeText, props.onChangeTournamentTime, "Minutes")
        : null}
      {props.schedulingMode === "ROUND_ROBIN" ? (
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Regular scheduling plays every pairing automatically — no target games or time limit to enter.
        </Text>
      ) : null}

      <View style={cardStyles.container}>
        <Text style={[typography.sectionTitle, { color: colors.text }]}>Estimate</Text>
        {props.estimate ? (
          <>
            <Text style={{ color: colors.text }}>Rounds: {props.estimate.rounds}</Text>
            <Text style={{ color: colors.text }}>Games per player: {props.estimate.gamesPerPlayer}</Text>
            <Text style={{ color: colors.text }}>Duration: {props.estimate.durationMinutes} min</Text>
          </>
        ) : (
          <Text style={{ color: colors.muted }}>Enter valid settings to see an estimate.</Text>
        )}
      </View>
      {props.responseText ? <Text style={{ color: colors.muted }}>{props.responseText}</Text> : null}
      {props.errorText ? <Text style={{ color: colors.danger }}>{props.errorText}</Text> : null}
    </WizardChrome>
  );
}
