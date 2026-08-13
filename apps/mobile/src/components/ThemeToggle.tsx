import { Pressable, Switch, Text, View } from "react-native";

import { radius, spacing } from "../theme";
import { useTheme } from "../theme/ThemeProvider";

interface ThemeToggleProps {
  compact?: boolean;
}

/** Matches web ThemeToggle: sun/moon glyph + Day/Dark label. */
export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { mode, colors, toggleMode } = useTheme();
  const isLight = mode === "light";
  const icon = isLight ? "☀️" : "🌙";
  const label = isLight ? "Day" : "Dark";

  if (compact) {
    return (
      <Pressable
        onPress={toggleMode}
        accessibilityRole="switch"
        accessibilityState={{ checked: isLight }}
        accessibilityLabel={isLight ? "Switch to dark mode" : "Switch to day mode"}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          minHeight: 36
        }}
      >
        <Text style={{ fontSize: 14 }} accessibilityElementsHidden>
          {icon}
        </Text>
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{label}</Text>
      </Pressable>
    );
  }

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
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Text style={{ fontSize: 20 }} accessibilityElementsHidden>
          {icon}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>Day mode</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            Easier to read in bright environments
          </Text>
        </View>
      </View>
      <Switch
        value={isLight}
        onValueChange={toggleMode}
        trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
        thumbColor={colors.surface}
        accessibilityLabel={isLight ? "Day mode on" : "Day mode off"}
      />
    </View>
  );
}
