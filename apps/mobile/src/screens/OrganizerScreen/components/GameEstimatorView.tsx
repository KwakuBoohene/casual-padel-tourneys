import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { useBreakpoint } from "../../../layout";
import type { Estimate } from "../types";
import { radius, spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { EstimatorEstimateCard } from "./EstimatorEstimateCard";
import { EstimatorTypeCard } from "./EstimatorTypeCard";

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
  const { colors, cardStyles } = useTheme();
  const { isWide, formMaxWidth } = useBreakpoint();
  const showAmericanoScheduling = props.mode === "AMERICANO";

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>{label}</Text>
      <TextInput
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          color: colors.text
        }}
      />
    </View>
  );

  const typeCard = (
    <EstimatorTypeCard
      mode={props.mode}
      variant={props.variant}
      schedulingMode={props.schedulingMode}
      onChangeMode={props.onChangeMode}
      onChangeVariant={props.onChangeVariant}
      onChangeSchedulingMode={props.onChangeSchedulingMode}
    />
  );

  const configCard = (
    <View style={[cardStyles.container, { gap: spacing.md }]}>
      <Text style={[typography.sectionTitle, { color: colors.text }]}>Configuration</Text>
      {field("Players", props.usersText, props.onChangeUsers, "Number of players")}
      {field("Courts", props.courtsText, props.onChangeCourts, "Number of courts")}
      {field("Points Per Match", props.pointsText, props.onChangePoints, "Points per match")}
      {props.schedulingMode === "TARGET_GAMES" && showAmericanoScheduling
        ? field("Target Games", props.targetGamesText, props.onChangeTargetGames, "Target games per player")
        : null}
      {props.schedulingMode === "TOTAL_TIME" || props.mode === "MEXICANO"
        ? field("Tournament Time", props.tournamentTimeText, props.onChangeTournamentTime, "Minutes")
        : null}
      {props.schedulingMode === "ROUND_ROBIN" && showAmericanoScheduling ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Regular scheduling uses player count only — no target games or time limit.
        </Text>
      ) : null}
    </View>
  );

  const estimateCard = (
    <EstimatorEstimateCard estimate={props.estimate} style={{ marginTop: isWide ? 0 : spacing.sm }} />
  );

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
        gap: spacing.xl,
        backgroundColor: colors.background,
        maxWidth: formMaxWidth,
        width: "100%",
        alignSelf: "center"
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

      {isWide ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.lg, flexWrap: "wrap" }}>
          <View style={{ flex: 1, minWidth: 280, gap: spacing.lg }}>
            {typeCard}
            {configCard}
          </View>
          <View style={{ flex: 1, minWidth: 280 }}>{estimateCard}</View>
        </View>
      ) : (
        <>
          {typeCard}
          {configCard}
          {estimateCard}
        </>
      )}
    </ScrollView>
  );
}
