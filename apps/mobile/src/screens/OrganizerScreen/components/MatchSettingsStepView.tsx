import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { SchedulingMode } from "@padel/shared";

import { AlertSheet } from "../../../components/sheets";
import type { Estimate } from "../types";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { SettingsEstimateCard } from "./SettingsEstimateCard";
import { SettingsStepper } from "./SettingsStepper";
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

function toInt(text: string, fallback: number): number {
  const n = Number(text);
  return Number.isFinite(n) && Number.isInteger(n) ? n : fallback;
}

export function MatchSettingsStepView(props: MatchSettingsStepViewProps) {
  const { colors } = useTheme();
  const [showError, setShowError] = useState(false);
  const courts = toInt(props.courtsText, 1);
  const points = toInt(props.pointsText, 24);
  const targetGames = toInt(props.targetGamesText, 8);
  const tournamentTime = toInt(props.tournamentTimeText, 120);
  const minPlayersForCourts = courts > 0 ? courts * 4 : 0;
  const hasEnoughPlayersForCourts = courts > 0 && props.playersCount >= minPlayersForCourts;

  useEffect(() => {
    if (props.errorText) setShowError(true);
  }, [props.errorText]);

  const estimateLine = props.estimate
    ? `~${props.estimate.rounds} rounds · ~${props.estimate.gamesPerPlayer} matches/player · ~${Math.max(
        1,
        Math.round(props.estimate.durationMinutes / 60)
      )}h`
    : "Enter valid settings to see an estimate.";

  const tryCreate = () => {
    if (!hasEnoughPlayersForCourts) {
      setShowError(true);
      return;
    }
    props.onCreate();
  };

  return (
    <>
      <WizardChrome
        modeLabel={props.modeLabel}
        stepIndex={4}
        stepCount={4}
        title="Americano scoring"
        primaryLabel="Create tournament"
        primaryDisabled={!hasEnoughPlayersForCourts}
        onPrimary={tryCreate}
        onBack={props.onBack}
      >
        <View style={{ gap: spacing.md }}>
          <SettingsStepper
            label="Courts"
            value={courts}
            min={1}
            max={16}
            onChange={(value) => props.onChangeCourts(String(value))}
          />
          <SettingsStepper
            label="Americano points (to)"
            value={points}
            min={8}
            max={64}
            step={2}
            onChange={(value) => props.onChangePoints(String(value))}
          />
          {props.schedulingMode === "TARGET_GAMES" ? (
            <SettingsStepper
              label="Games per player"
              value={targetGames}
              min={1}
              max={40}
              onChange={(value) => props.onChangeTargetGames(String(value))}
            />
          ) : null}
          {props.schedulingMode === "TOTAL_TIME" ? (
            <SettingsStepper
              label="Tournament time (minutes)"
              value={tournamentTime}
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

          {!hasEnoughPlayersForCourts ? (
            <Text style={{ color: colors.danger, fontSize: 12 }}>
              You need at least {minPlayersForCourts || 4} players for {courts} court
              {courts === 1 ? "" : "s"}.
            </Text>
          ) : null}

          <SettingsEstimateCard line={estimateLine} />

          {props.responseText ? <Text style={{ color: colors.muted }}>{props.responseText}</Text> : null}
        </View>
      </WizardChrome>

      <AlertSheet
        visible={showError}
        variant="error"
        title="Cannot create tournament"
        message={
          props.errorText ||
          `You need at least ${minPlayersForCourts || 4} players for ${courts} court${courts === 1 ? "" : "s"}.`
        }
        primaryAction={{ label: "OK", onPress: () => setShowError(false) }}
        onDismiss={() => setShowError(false)}
      />
    </>
  );
}
