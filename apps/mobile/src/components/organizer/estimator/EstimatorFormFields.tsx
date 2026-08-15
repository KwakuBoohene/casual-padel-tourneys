import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";
import { Text, View } from "react-native";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { EstimatorTypeCard } from "./EstimatorTypeCard";
import { SettingsStepper } from "../create/SettingsStepper";

interface EstimatorFormFieldsProps {
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  players: number;
  courts: number;
  points: number;
  targetGames: number;
  tournamentTime: number;
  onChangeMode: (value: TournamentMode) => void;
  onChangeVariant: (value: TournamentVariant) => void;
  onChangeSchedulingMode: (value: SchedulingMode) => void;
  onChangeUsers: (value: string) => void;
  onChangeCourts: (value: string) => void;
  onChangePoints: (value: string) => void;
  onChangeTargetGames: (value: string) => void;
  onChangeTournamentTime: (value: string) => void;
}

export function EstimatorFormFields(props: EstimatorFormFieldsProps) {
  const { colors } = useTheme();
  const showAmericanoScheduling = props.mode === "AMERICANO";

  return (
    <View style={{ gap: spacing.md }}>
      <EstimatorTypeCard
        mode={props.mode}
        variant={props.variant}
        schedulingMode={props.schedulingMode}
        onChangeMode={props.onChangeMode}
        onChangeVariant={props.onChangeVariant}
        onChangeSchedulingMode={props.onChangeSchedulingMode}
      />
      <SettingsStepper
        label="Players"
        value={props.players}
        min={4}
        max={64}
        onChange={(value) => props.onChangeUsers(String(value))}
      />
      <SettingsStepper
        label="Courts"
        value={props.courts}
        min={1}
        max={16}
        onChange={(value) => props.onChangeCourts(String(value))}
      />
      <SettingsStepper
        label="Americano points"
        value={props.points}
        min={8}
        max={64}
        step={2}
        onChange={(value) => props.onChangePoints(String(value))}
      />
      {props.schedulingMode === "TARGET_GAMES" && showAmericanoScheduling ? (
        <SettingsStepper
          label="Target games"
          value={props.targetGames}
          min={1}
          max={40}
          onChange={(value) => props.onChangeTargetGames(String(value))}
        />
      ) : null}
      {props.schedulingMode === "TOTAL_TIME" || props.mode === "MEXICANO" ? (
        <SettingsStepper
          label="Tournament time (minutes)"
          value={props.tournamentTime}
          min={10}
          max={480}
          step={5}
          onChange={(value) => props.onChangeTournamentTime(String(value))}
        />
      ) : null}
      {props.schedulingMode === "ROUND_ROBIN" && showAmericanoScheduling ? (
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Regular scheduling uses player count only — no target games or time limit.
        </Text>
      ) : null}
    </View>
  );
}
