import { Switch, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface CareerOptInRowProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function CareerOptInRow(props: CareerOptInRowProps) {
  const { colors } = useTheme();
  const helper = props.value
    ? "Completed matches are added to this organizer's career leaderboard."
    : "Results stay in this event only.";

  return (
    <View
      style={{
        minHeight: touch.minSecondary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
          Count toward career leaderboard
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{helper}</Text>
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onChange}
        trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
        thumbColor={colors.surface}
        accessibilityLabel="Count toward career leaderboard"
      />
    </View>
  );
}
