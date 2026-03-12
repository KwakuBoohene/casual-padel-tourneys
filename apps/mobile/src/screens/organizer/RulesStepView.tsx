import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import type { Estimate } from "./types";
import { cardStyles, colors, radius, spacing, typography } from "../../theme";

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
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface
          }}
        >
          <Text style={{ color: colors.text }}>Americano</Text>
        </Pressable>
        <Pressable
          onPress={() => props.onChangeMode("MEXICANO")}
          style={{
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface
          }}
        >
          <Text style={{ color: colors.text }}>Mexicano</Text>
        </Pressable>
      </View>

      <Text style={{ color: colors.muted }}>Variant</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable
          onPress={() => props.onChangeVariant("CLASSIC")}
          style={{
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface
          }}
        >
          <Text style={{ color: colors.text }}>Classic</Text>
        </Pressable>
        <Pressable
          onPress={() => props.onChangeVariant("MIXED")}
          style={{
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface
          }}
        >
          <Text style={{ color: colors.text }}>Mixed</Text>
        </Pressable>
        <Pressable
          onPress={() => props.onChangeVariant("TEAM")}
          style={{
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface
          }}
        >
          <Text style={{ color: colors.text }}>Team</Text>
        </Pressable>
      </View>

      {props.mode === "AMERICANO" ? (
        <>
          <Text style={{ color: colors.muted }}>Scheduling</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              onPress={() => props.onChangeSchedulingMode("TARGET_GAMES")}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface
              }}
            >
              <Text style={{ color: colors.text }}>Games Per Player</Text>
            </Pressable>
            <Pressable
              onPress={() => props.onChangeSchedulingMode("TOTAL_TIME")}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface
              }}
            >
              <Text style={{ color: colors.text }}>Total Time</Text>
            </Pressable>
            <Pressable
              onPress={() => props.onChangeSchedulingMode("ROUND_ROBIN")}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface
              }}
            >
              <Text style={{ color: colors.text }}>Round Robin</Text>
            </Pressable>
          </View>
        </>
      ) : null}

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
      />
      <Text style={{ color: colors.muted }}>Points Per Match</Text>
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
      />

      {props.schedulingMode === "TARGET_GAMES" ? (
        <>
          <Text style={{ color: colors.muted }}>Target Games Per Player</Text>
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
          />
        </>
      ) : null}

      {props.schedulingMode === "TOTAL_TIME" ? (
        <>
          <Text style={{ color: colors.muted }}>Tournament Time (minutes)</Text>
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
        {props.estimate ? (
          <>
            <Text style={{ color: colors.text }}>Rounds: {props.estimate.rounds}</Text>
            <Text style={{ color: colors.text }}>Approx games per player: {props.estimate.gamesPerPlayer}</Text>
            <Text style={{ color: colors.text }}>Estimated total time: {props.estimate.durationMinutes} minutes</Text>
          </>
        ) : (
          <Text style={{ color: colors.muted }}>Fill in valid numeric values to see the estimate.</Text>
        )}
      </View>

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
      <View>
        <Text style={{ color: colors.text }}>{props.responseText}</Text>
        {props.errorText ? <Text style={{ color: colors.danger }}>Error: {props.errorText}</Text> : null}
      </View>
    </ScrollView>
  );
}
