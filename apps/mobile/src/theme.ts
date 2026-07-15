import type { PadelColors } from "@padel/shared/theme";

export { getColors, darkColors, lightColors, type ThemeMode, type PadelColors } from "@padel/shared/theme";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999
};

export const typography = {
  title: { fontSize: 24, fontWeight: "700" as const },
  sectionTitle: { fontSize: 18, fontWeight: "700" as const },
  label: { fontSize: 10, fontWeight: "600" as const, letterSpacing: 1.5 },
  body: { fontSize: 14 }
};

export function getCardStyles(colors: PadelColors) {
  return {
    container: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border
    }
  };
}
