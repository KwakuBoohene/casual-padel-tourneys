import { Switch, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface CareerOptInRowProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function CareerOptInRow(props: CareerOptInRowProps) {
  const { colors } = useTheme();
  const helper = props.value
    ? "Completed matches count on the career leaderboard. Turn off to remove this event."
    : "This event is off the career board. Turn on to add completed matches.";

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
        backgroundColor: colors.surface,
        opacity: props.disabled ? 0.55 : 1
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
        disabled={props.disabled}
        trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
        thumbColor={colors.surface}
        accessibilityLabel="Count toward career leaderboard"
      />
    </View>
  );
}
