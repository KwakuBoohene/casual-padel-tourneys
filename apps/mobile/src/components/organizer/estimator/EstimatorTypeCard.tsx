import { Text, View } from "react-native";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { EstimatorChoice } from "./EstimatorChoice";

interface EstimatorTypeCardProps {
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  onChangeMode: (value: TournamentMode) => void;
  onChangeVariant: (value: TournamentVariant) => void;
  onChangeSchedulingMode: (value: SchedulingMode) => void;
}

export function EstimatorTypeCard(props: EstimatorTypeCardProps) {
  const { colors, cardStyles } = useTheme();
  const showAmericanoScheduling = props.mode === "AMERICANO";

  return (
    <View style={[cardStyles.container, { gap: spacing.md }]}>
      <Text style={[typography.sectionTitle, { color: colors.text }]}>Tournament Type</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <EstimatorChoice label="Americano" active={props.mode === "AMERICANO"} flex onPress={() => props.onChangeMode("AMERICANO")} />
        <EstimatorChoice label="Mexicano" active={props.mode === "MEXICANO"} flex onPress={() => props.onChangeMode("MEXICANO")} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <EstimatorChoice label="Classic" active={props.variant === "CLASSIC"} onPress={() => props.onChangeVariant("CLASSIC")} />
        <EstimatorChoice label="Mixed" active={props.variant === "MIXED"} onPress={() => props.onChangeVariant("MIXED")} />
      </View>
      {showAmericanoScheduling ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Scheduling</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <EstimatorChoice
              label="Target Games"
              active={props.schedulingMode === "TARGET_GAMES"}
              onPress={() => props.onChangeSchedulingMode("TARGET_GAMES")}
            />
            <EstimatorChoice
              label="Total Time"
              active={props.schedulingMode === "TOTAL_TIME"}
              onPress={() => props.onChangeSchedulingMode("TOTAL_TIME")}
            />
            <EstimatorChoice
              label="Regular"
              active={props.schedulingMode === "ROUND_ROBIN"}
              onPress={() => props.onChangeSchedulingMode("ROUND_ROBIN")}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
