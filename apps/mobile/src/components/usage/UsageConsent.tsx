import { Switch, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme";

export function UsageConsent({
  consent,
  onChange
}: {
  consent: boolean | null;
  onChange(value: boolean): void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing.md }}>
      <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }}>Usage analytics</Text>
        <Switch
          value={consent === true}
          disabled={consent === null}
          onValueChange={onChange}
          accessibilityLabel="Usage analytics"
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.text}
        />
      </View>
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        Shares screen types and your organizer account. Turning this off stops future screen visits from
        this device. Account and tournament actions are reported separately.
      </Text>
    </View>
  );
}
