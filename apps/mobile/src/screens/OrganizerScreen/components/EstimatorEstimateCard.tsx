import { Text, View } from "react-native";

import type { Estimate } from "../types";
import { typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface EstimatorEstimateCardProps {
  estimate: Estimate | null;
  style?: object;
}

export function EstimatorEstimateCard(props: EstimatorEstimateCardProps) {
  const { colors, cardStyles } = useTheme();
  return (
    <View style={[cardStyles.container, props.style]}>
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
  );
}
