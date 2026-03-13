import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { SchedulingMode } from "@padel/shared";

import type { Estimate } from "../types";
import { cardStyles, colors, radius, spacing, typography } from "../../../theme";

interface MatchSettingsStepViewProps {
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
  const courts = Number(props.courtsText);
  const minPlayersForCourts = Number.isFinite(courts) && courts > 0 ? courts * 4 : 0;
  const hasEnoughPlayersForCourts =
    Number.isFinite(courts) && courts > 0 && props.playersCount >= minPlayersForCourts;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Text style={[typography.title, { color: colors.text }]}>Match Settings</Text>
      <Text style={{ color: colors.muted }}>Courts</Text>
      <TextInput
        value={props.courtsText}
        onChangeText={props.onChangeCourts}
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          color: colors.text
        }}
        placeholder="Number of courts"
        placeholderTextColor={colors.muted}
      />
      {!hasEnoughPlayersForCourts ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>
          You need at least {minPlayersForCourts || 4} players for {props.courtsText || "1"} court
          {courts === 1 ? "" : "s"}.
        </Text>
      ) : null}

      <Text style={{ color: colors.muted, marginTop: spacing.sm }}>Points per match</Text>
      <TextInput
        value={props.pointsText}
        onChangeText={props.onChangePoints}
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          color: colors.text
        }}
        placeholder="Points per match"
        placeholderTextColor={colors.muted}
      />

      {props.schedulingMode === "TARGET_GAMES" ? (
        <>
          <Text style={{ color: colors.muted, marginTop: spacing.sm }}>Target games per player</Text>
          <TextInput
            value={props.targetGamesText}
            onChangeText={props.onChangeTargetGames}
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              color: colors.text
            }}
            placeholder="Target games per player"
            placeholderTextColor={colors.muted}
          />
        </>
      ) : (
        <>
          <Text style={{ color: colors.muted, marginTop: spacing.sm }}>Tournament time (minutes)</Text>
          <TextInput
            value={props.tournamentTimeText}
            onChangeText={props.onChangeTournamentTime}
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              color: colors.text
            }}
            placeholder="Tournament time in minutes"
            placeholderTextColor={colors.muted}
          />
        </>
      )}

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

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
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
          onPress={props.onCreate}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: hasEnoughPlayersForCourts ? 1 : 0.5
          }}
          disabled={!hasEnoughPlayersForCourts}
        >
          <Text
            style={{
              color: "#020617",
              fontWeight: "700"
            }}
          >
            Create Tournament
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

