import { Switch, Text, View } from "react-native";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface CareerOptInToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

/** Default-on opt-in for contributing event results to the organizer career board. */
export function CareerOptInToggle(props: CareerOptInToggleProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>Career leaderboard</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          Count match results from this event toward your account-wide player rankings. You can turn
          this off for casual nights.
        </Text>
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onChange}
        trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
        thumbColor={colors.surface}
        accessibilityLabel="Contribute to career leaderboard"
      />
    </View>
  );
}
