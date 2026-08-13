import { Text, View } from "react-native";

import { radius, spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

const TABS = ["Home", "History", "Profile"] as const;

export function TournamentListBottomNav() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        marginTop: spacing.lg,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: "row",
        justifyContent: "space-between"
      }}
    >
      {TABS.map((label, index) => (
        <View key={label} style={{ alignItems: "center", flex: 1 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: radius.pill,
              backgroundColor: index === 0 ? colors.primary : colors.muted,
              marginBottom: 4
            }}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 1,
              textTransform: "uppercase",
              color: index === 0 ? colors.primary : colors.muted
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
