import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import type { Estimate } from "../types";
import { cardStyles, colors, radius, spacing, typography } from "../../../theme";

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
  const schedulingModeLabel = props.schedulingMode === "TARGET_GAMES" ? "Target Games" : "Tournament Time";
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
        gap: spacing.xl,
        backgroundColor: colors.background
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[typography.title, { color: colors.text }]}>Game Estimator</Text>
        <Pressable
          onPress={props.onBack}
          style={{
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Back</Text>
        </Pressable>
      </View>

      <View style={[cardStyles.container, { gap: spacing.md }]}>
        <Text style={[typography.sectionTitle, { color: colors.text }]}>Tournament Type</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["AMERICANO", "MEXICANO"] as TournamentMode[]).map((value) => (
            <Pressable
              key={value}
              onPress={() => props.onChangeMode(value)}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: props.mode === value ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: props.mode === value ? colors.primary : colors.border,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text
                style={{
                  color: props.mode === value ? "#020617" : colors.text,
                  fontWeight: "700"
                }}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["CLASSIC", "MIXED"] as TournamentVariant[]).map((value) => (
            <Pressable
              key={value}
              onPress={() => props.onChangeVariant(value)}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: props.variant === value ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: props.variant === value ? colors.primary : colors.border,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text
                style={{
                  color: props.variant === value ? "#020617" : colors.text,
                  fontWeight: "700"
                }}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[cardStyles.container, { gap: spacing.md }]}>
        <Text style={[typography.sectionTitle, { color: colors.text }]}>Configuration</Text>
        <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>Quickly estimate how long a tournament will take.</Text>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Players</Text>
          <TextInput
            keyboardType="numeric"
            value={props.usersText}
            onChangeText={props.onChangeUsers}
            placeholder="Number of players"
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
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Courts</Text>
          <TextInput
            keyboardType="numeric"
            value={props.courtsText}
            onChangeText={props.onChangeCourts}
            placeholder="Number of courts"
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
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Points Per Match</Text>
          <TextInput
            keyboardType="numeric"
            value={props.pointsText}
            onChangeText={props.onChangePoints}
            placeholder="Points per match"
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
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>{schedulingModeLabel}</Text>
          {props.schedulingMode === "TARGET_GAMES" ? (
            <TextInput
              keyboardType="numeric"
              value={props.targetGamesText}
              onChangeText={props.onChangeTargetGames}
              placeholder="Target games per player"
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
          ) : (
            <TextInput
              keyboardType="numeric"
              value={props.tournamentTimeText}
              onChangeText={props.onChangeTournamentTime}
              placeholder="Tournament time (minutes)"
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
          )}
        </View>
      </View>

      <View style={[cardStyles.container, { marginTop: spacing.sm }]}>
        <Text style={[typography.sectionTitle, { color: colors.text }]}>Estimate</Text>
        {props.estimate ? (
          <>
            <Text style={{ color: colors.text }}>Rounds: {props.estimate.rounds}</Text>
            <Text style={{ color: colors.text }}>Games per player: {props.estimate.gamesPerPlayer}</Text>
            <Text style={{ color: colors.text }}>Duration: {props.estimate.durationMinutes} min</Text>
          </>
        ) : (
          <Text style={{ color: colors.muted }}>Enter valid configuration to see an estimate.</Text>
        )}
      </View>
    </ScrollView>
  );
}

