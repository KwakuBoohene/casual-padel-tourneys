import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import type { Estimate } from "../types";
import { cardStyles, colors, radius, spacing, typography } from "../../../theme";

interface RulesStepViewProps {
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  estimate: Estimate | null;
  responseText: string;
  errorText: string;
  onChangeMode: (value: TournamentMode) => void;
  onChangeVariant: (value: TournamentVariant) => void;
  onChangeSchedulingMode: (value: SchedulingMode) => void;
  onChangeCourts: (value: string) => void;
  onChangePoints: (value: string) => void;
  onChangeTargetGames: (value: string) => void;
  onChangeTournamentTime: (value: string) => void;
  onBack: () => void;
  onCreate: () => void;
}

export function RulesStepView(props: RulesStepViewProps) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Text style={[typography.title, { color: colors.text }]}>Tournament Rules</Text>
      <Text style={{ color: colors.muted }}>Mode</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable
          onPress={() => props.onChangeMode("AMERICANO")}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: props.mode === "AMERICANO" ? colors.primary : colors.border,
            backgroundColor: props.mode === "AMERICANO" ? "rgba(173,255,47,0.16)" : colors.surface
          }}
        >
          <Text style={{ color: colors.text, fontWeight: props.mode === "AMERICANO" ? "700" : "500" }}>Americano</Text>
        </Pressable>
        <Pressable
          onPress={() => props.onChangeMode("MEXICANO")}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: props.mode === "MEXICANO" ? colors.primary : colors.border,
            backgroundColor: props.mode === "MEXICANO" ? "rgba(173,255,47,0.16)" : colors.surface
          }}
        >
          <Text style={{ color: colors.text, fontWeight: props.mode === "MEXICANO" ? "700" : "500" }}>Mexicano</Text>
        </Pressable>
      </View>

      <Text style={{ color: colors.muted, marginTop: spacing.sm }}>Variant</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable
          onPress={() => props.onChangeVariant("CLASSIC")}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: props.variant === "CLASSIC" ? colors.primary : colors.border,
            backgroundColor: props.variant === "CLASSIC" ? "rgba(173,255,47,0.16)" : colors.surface
          }}
        >
          <Text style={{ color: colors.text, fontWeight: props.variant === "CLASSIC" ? "700" : "500" }}>Classic</Text>
        </Pressable>
        <Pressable
          onPress={() => props.onChangeVariant("MIXED")}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: props.variant === "MIXED" ? colors.primary : colors.border,
            backgroundColor: props.variant === "MIXED" ? "rgba(173,255,47,0.16)" : colors.surface
          }}
        >
          <Text style={{ color: colors.text, fontWeight: props.variant === "MIXED" ? "700" : "500" }}>Mixed</Text>
        </Pressable>
      </View>

      <Text style={{ color: colors.muted, marginTop: spacing.sm }}>Courts</Text>
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

      <Text style={{ color: colors.muted, marginTop: spacing.sm }}>Scheduling</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable
          onPress={() => props.onChangeSchedulingMode("TARGET_GAMES")}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: props.schedulingMode === "TARGET_GAMES" ? colors.primary : colors.border,
            backgroundColor: props.schedulingMode === "TARGET_GAMES" ? "rgba(173,255,47,0.16)" : colors.surface
          }}
        >
          <Text style={{ color: colors.text, fontWeight: props.schedulingMode === "TARGET_GAMES" ? "700" : "500" }}>
            Target Games
          </Text>
        </Pressable>
        <Pressable
          onPress={() => props.onChangeSchedulingMode("TOTAL_TIME")}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: props.schedulingMode === "TOTAL_TIME" ? colors.primary : colors.border,
            backgroundColor: props.schedulingMode === "TOTAL_TIME" ? "rgba(173,255,47,0.16)" : colors.surface
          }}
        >
          <Text style={{ color: colors.text, fontWeight: props.schedulingMode === "TOTAL_TIME" ? "700" : "500" }}>
            Total Time
          </Text>
        </Pressable>
      </View>

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

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
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
            justifyContent: "center"
          }}
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

