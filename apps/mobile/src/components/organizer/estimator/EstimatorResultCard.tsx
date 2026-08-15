import { Text, View } from "react-native";

import type { Estimate } from "../../../types/organizer/tournament";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface EstimatorResultCardProps {
  estimate: Estimate | null;
  approximate?: boolean;
  style?: object;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.max(1, Math.round(minutes / 60));
  return `~${hours} hour${hours === 1 ? "" : "s"}`;
}

export function EstimatorResultCard(props: EstimatorResultCardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          flexGrow: 1,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: colors.primary,
          backgroundColor: colors.surface,
          padding: spacing.md,
          gap: 6
        },
        props.style
      ]}
    >
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>
        {props.approximate ? "Approximate result" : "Result"}
      </Text>
      {props.estimate ? (
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.muted, fontSize: 15 }}>{props.estimate.rounds} rounds</Text>
          <Text style={{ color: colors.muted, fontSize: 15 }}>
            ~{props.estimate.gamesPerPlayer} matches per player
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15 }}>
            {formatDuration(props.estimate.durationMinutes)}
          </Text>
        </View>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 15 }}>
          Enter a valid configuration to see an estimate.
        </Text>
      )}
    </View>
  );
}
