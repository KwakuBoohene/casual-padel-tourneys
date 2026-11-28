import { Switch, Text, View } from "react-native";

import { radius, spacing } from "../../../../theme";
import { useTheme } from "../../../../theme/ThemeProvider";

interface KeepAccessToggleRowProps {
  value: boolean;
  /** Only the owner (or an account Manager) can change it; editors see it read-only. */
  editable: boolean;
  busy: boolean;
  onChange: (value: boolean) => void;
}

export function KeepAccessToggleRow({ value, editable, busy, onChange }: KeepAccessToggleRowProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.background,
        padding: spacing.md
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>Keep access after start</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          {editable
            ? "Co-organizers can run scoring once it's live. They can never delete it."
            : "Set by the owner. Co-organizers never get delete rights."}
        </Text>
      </View>
      <Switch
        value={value}
        disabled={!editable || busy}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
        thumbColor={colors.surface}
        accessibilityLabel={value ? "Keep access after start on" : "Keep access after start off"}
      />
    </View>
  );
}
