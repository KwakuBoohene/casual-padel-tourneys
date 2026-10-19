import { Text, View } from "react-native";

import { radius, spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

export function SessionExpiredNotice() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        width: "100%",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt
      }}
    >
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>Your session expired</Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: spacing.xs }}>
        Please sign in again to continue.
      </Text>
    </View>
  );
}
