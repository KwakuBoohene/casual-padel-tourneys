import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import type { Estimate } from "./types";
import { cardStyles, colors, radius, spacing, typography } from "../../theme";

interface GameEstimatorViewProps {
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  usersText: string;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  estimate: Estimate | null;
  onChangeMode: (value: TournamentMode) => void;
  onChangeVariant: (value: TournamentVariant) => void;
  onChangeSchedulingMode: (value: SchedulingMode) => void;
  onChangeUsers: (value: string) => void;
  onChangeCourts: (value: string) => void;
  onChangePoints: (value: string) => void;
  onChangeTargetGames: (value: string) => void;
  onChangeTournamentTime: (value: string) => void;
  onBack: () => void;
}

export function GameEstimatorView(props: GameEstimatorViewProps) {
  const playersCount = Number(props.usersText);
  const courts = Number(props.courtsText);
  const minPlayersForCourts = Number.isFinite(courts) && courts > 0 ? courts * 4 : 0;
  const hasEnoughPlayersForCourts =
    Number.isFinite(playersCount) && Number.isFinite(courts) && playersCount >= minPlayersForCourts;

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
      <Text style={[typography.title, { color: colors.text }]}>Game Estimator</Text>
      <Text style={{ color: colors.muted }}>Format</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {renderChoice("Americano", props.mode === "AMERICANO", () => props.onChangeMode("AMERICANO"))}
        {renderChoice("Mexicano", props.mode === "MEXICANO", () => props.onChangeMode("MEXICANO"))}
      </View>

      <Text style={{ color: colors.muted }}>Type of game</Text>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {renderChoice("Classic", props.variant === "CLASSIC", () => props.onChangeVariant("CLASSIC"))}
        {renderChoice("Mixed", props.variant === "MIXED", () => props.onChangeVariant("MIXED"))}
        {renderChoice("Team", props.variant === "TEAM", () => props.onChangeVariant("TEAM"))}
      </View>

      <Text style={{ color: colors.muted }}>Options</Text>
      {props.mode === "AMERICANO" ? (
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {renderChoice("Games Per Player", props.schedulingMode === "TARGET_GAMES", () => props.onChangeSchedulingMode("TARGET_GAMES"))}
          {renderChoice("Total Time", props.schedulingMode === "TOTAL_TIME", () => props.onChangeSchedulingMode("TOTAL_TIME"))}
          {renderChoice("Round Robin", props.schedulingMode === "ROUND_ROBIN", () => props.onChangeSchedulingMode("ROUND_ROBIN"))}
        </View>
      ) : (
        <Text style={{ color: colors.muted }}>Mexicano uses Total Time scheduling.</Text>
      )}

      <Text style={{ color: colors.muted }}>Number of users</Text>
      <TextInput
        value={props.usersText}
        onChangeText={props.onChangeUsers}
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          color: colors.text
        }}
        placeholderTextColor={colors.muted}
      />

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
        placeholderTextColor={colors.muted}
      />
      {!hasEnoughPlayersForCourts && minPlayersForCourts > 0 ? (
        <Text style={{ color: colors.danger }}>
          {courts} court{courts === 1 ? "" : "s"} need at least {minPlayersForCourts} players.
        </Text>
      ) : null}

      <Text style={{ color: colors.muted }}>Points per match</Text>
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
        placeholderTextColor={colors.muted}
      />

      {props.schedulingMode === "TARGET_GAMES" ? (
        <>
          <Text style={{ color: colors.muted }}>Target games per player</Text>
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
            placeholderTextColor={colors.muted}
          />
        </>
      ) : null}

      {props.schedulingMode === "TOTAL_TIME" ? (
        <>
          <Text style={{ color: colors.muted }}>Total tournament time (minutes)</Text>
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
            placeholderTextColor={colors.muted}
          />
        </>
      ) : null}

      <View
        style={[
          cardStyles.container,
          {
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            gap: 4
          }
        ]}
      >
        <Text style={{ fontWeight: "700", color: colors.text }}>Estimated Duration</Text>
        {props.estimate && hasEnoughPlayersForCourts ? (
          <>
            <Text style={{ color: colors.text }}>Rounds: {props.estimate.rounds}</Text>
            <Text style={{ color: colors.text }}>Approx games per player: {props.estimate.gamesPerPlayer}</Text>
            <Text style={{ color: colors.text }}>Estimated total time: {props.estimate.durationMinutes} minutes</Text>
          </>
        ) : (
          <Text style={{ color: colors.muted }}>Enter valid values to see estimate.</Text>
        )}
      </View>

      <Pressable
        onPress={props.onBack}
        style={{
          marginTop: spacing.sm,
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
    </ScrollView>
  );
}
