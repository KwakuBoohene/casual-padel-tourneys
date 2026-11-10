import type { ReactNode } from "react";
import { Switch, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { useUsageVisits } from "../../hooks/usage/useUsageVisits";

export function UsageConsent({ children }: { children: ReactNode }) {
  const usage = useUsageVisits();
  const { colors } = useTheme();
  if (!usage.enabled) return <>{children}</>;
  return (
    <View style={{ flex: 1 }} onTouchStart={usage.track}>
      <View style={{ padding: 12, gap: 8, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Optional organizer usage analytics: {usage.consent ? "On" : "Off"}. Reports include visited screen
          types and your signed-in account, without screen contents or share links. This setting controls first-party Organizer reporting. Turning it off stops future visits; successful account and tournament actions may
          still appear in operational reporting.
        </Text>
        <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Switch
            value={usage.consent}
            onValueChange={usage.choose}
            accessibilityLabel="Share optional organizer usage"
            trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
            thumbColor={colors.surface}
            hitSlop={12}
          />
          <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }}>
            {usage.consent ? "Usage analytics on" : "Allow usage analytics on this device"}
          </Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
