import { useState } from "react";
import { Pressable, Text } from "react-native";

import { useStandingsColumns } from "../../providers/StandingsColumnsProvider";
import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

import { StandingsColumnsSheet } from "./StandingsColumnsSheet";

/** Opens the column picker. Sits beside `StandingsHelpControl` on both boards. */
export function StandingsColumnsControl() {
  const { colors } = useTheme();
  const { visible, toggle, reset } = useStandingsColumns();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Choose leaderboard columns"
        hitSlop={8}
        style={{
          minHeight: touch.minSecondary,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>Columns</Text>
      </Pressable>
      <StandingsColumnsSheet
        visible={open}
        selected={visible}
        onToggle={toggle}
        onReset={reset}
        onDismiss={() => setOpen(false)}
      />
    </>
  );
}
