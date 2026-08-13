import { Text, View } from "react-native";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface SettingsEstimateCardProps {
  line: string;
}

export function SettingsEstimateCard(props: SettingsEstimateCardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 2,
        borderColor: colors.primary,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: 4
      }}
    >
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>Estimate</Text>
      <Text style={{ color: colors.muted, fontSize: 14 }}>{props.line}</Text>
    </View>
  );
}
