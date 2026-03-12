export const colors = {
  background: "#0f172a",
  surface: "#1e293b",
  surfaceAlt: "#020617",
  text: "#e5e7eb",
  muted: "#9ca3af",
  primary: "#ADFF2F",
  danger: "#f97373",
  border: "rgba(148, 163, 184, 0.4)"
};

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

export const cardStyles = {
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border
  }
};

