import type { ReactNode } from "react";
import { View } from "react-native";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

export function LiveTournamentStickyActions({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background
      }}
    >
      {children}
    </View>
  );
}
