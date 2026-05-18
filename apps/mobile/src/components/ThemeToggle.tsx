import { Pressable, Switch, Text, View } from "react-native";

import { radius, spacing } from "../theme";
import { useTheme } from "../theme/ThemeProvider";

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { mode, colors, toggleMode } = useTheme();
  const isLight = mode === "light";

  if (compact) {
    return (
      <Pressable
        onPress={toggleMode}
        accessibilityRole="switch"
        accessibilityState={{ checked: isLight }}
        accessibilityLabel={isLight ? "Switch to dark mode" : "Switch to day mode"}
        style={{
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface
        }}
      >
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>
          {isLight ? "Day" : "Dark"}
        </Text>
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
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>Day mode</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
          Easier to read in bright environments
        </Text>
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
