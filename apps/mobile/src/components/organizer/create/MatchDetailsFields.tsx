import { Text, View } from "react-native";
import type {
  GameWinBy,
  RegularSetFormat,
  SchedulingMode,
  ScoringMode,
  TiebreakPoints
} from "@padel/shared";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { RegularSettingsFields } from "./RegularSettingsFields";
import { SettingsEstimateCard } from "./SettingsEstimateCard";
import { SettingsStepper } from "./SettingsStepper";

interface MatchDetailsFieldsProps {
  scoringMode: ScoringMode;
  schedulingMode: SchedulingMode;
  setFormat: RegularSetFormat;
  gameWinBy: GameWinBy;
  setsToWin: number;
  setTiebreakTo: TiebreakPoints;
  matchTiebreak: boolean;
  courts: number;
  points: number;
  targetGames: number;
  tournamentTime: number;
  playersCount: number;
  minPlayersForCourts: number;
  hasEnoughPlayersForCourts: boolean;
  estimateLine: string;
  responseText: string;
  onChangeSetFormat: (value: RegularSetFormat) => void;
  onChangeGameWinBy: (value: GameWinBy) => void;
  onChangeSetsToWin: (value: number) => void;
  onChangeSetTiebreakTo: (value: TiebreakPoints) => void;
  onChangeMatchTiebreak: (value: boolean) => void;
  onChangeCourts: (value: string) => void;
  onChangePoints: (value: string) => void;
  onChangeTargetGames: (value: string) => void;
  onChangeTournamentTime: (value: string) => void;
}

export function MatchDetailsFields(props: MatchDetailsFieldsProps) {
  const { colors } = useTheme();
  const isRegular = props.scoringMode === "REGULAR";

  return (
    <View style={{ gap: spacing.md }}>
      {isRegular ? (
        <RegularSettingsFields
          setFormat={props.setFormat}
          gameWinBy={props.gameWinBy}
          setsToWin={props.setsToWin}
          setTiebreakTo={props.setTiebreakTo}
          matchTiebreak={props.matchTiebreak}
          onChangeSetFormat={props.onChangeSetFormat}
          onChangeGameWinBy={props.onChangeGameWinBy}
          onChangeSetsToWin={props.onChangeSetsToWin}
          onChangeSetTiebreakTo={props.onChangeSetTiebreakTo}
          onChangeMatchTiebreak={props.onChangeMatchTiebreak}
        />
      ) : (
        <SettingsStepper
          label="Americano points (to)"
          value={props.points}
          min={8}
          max={64}
          step={2}
          onChange={(value) => props.onChangePoints(String(value))}
        />
      )}

      <SettingsStepper
        label="Courts"
        value={props.courts}
        min={1}
        max={16}
        onChange={(value) => props.onChangeCourts(String(value))}
      />
      {props.schedulingMode === "TARGET_GAMES" ? (
        <SettingsStepper
          label="Games per player"
          value={props.targetGames}
          min={1}
          max={40}
          onChange={(value) => props.onChangeTargetGames(String(value))}
        />
      ) : null}
      {props.schedulingMode === "TOTAL_TIME" ? (
        <SettingsStepper
          label="Tournament time (minutes)"
          value={props.tournamentTime}
          min={10}
          max={480}
          step={5}
          onChange={(value) => props.onChangeTournamentTime(String(value))}
        />
      ) : null}
      {props.schedulingMode === "ROUND_ROBIN" ? (
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Regular scheduling plays every pairing automatically — no games-per-player target.
        </Text>
      ) : null}

      {!props.hasEnoughPlayersForCourts ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>
          You need at least {props.minPlayersForCourts || 4} players for {props.courts} court
          {props.courts === 1 ? "" : "s"}.
        </Text>
      ) : null}

      <SettingsEstimateCard line={props.estimateLine} />
      {props.responseText ? <Text style={{ color: colors.muted }}>{props.responseText}</Text> : null}
    </View>
  );
}
