export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEY = "padel-theme";

export interface PadelColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  primary: string;
  onPrimary: string;
  danger: string;
  border: string;
  statusLive: string;
  statusNext: string;
  statusCompleted: string;
  statusPending: string;
  connected: string;
  disconnected: string;
}

export const darkColors: PadelColors = {
  background: "#0f172a",
  surface: "#1e293b",
  surfaceAlt: "#020617",
  text: "#e5e7eb",
  muted: "#9ca3af",
  primary: "#adff2f",
  onPrimary: "#020617",
  danger: "#f97373",
  border: "rgba(148, 163, 184, 0.4)",
  statusLive: "#adff2f",
  statusNext: "#fbbf24",
  statusCompleted: "#4ade80",
  statusPending: "#6b7280",
  connected: "#10b981",
  disconnected: "#ef4444"
};

export const lightColors: PadelColors = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",
  text: "#0f172a",
  muted: "#64748b",
  primary: "#84cc16",
  onPrimary: "#0f172a",
  danger: "#dc2626",
  border: "rgba(15, 23, 42, 0.12)",
  statusLive: "#65a30d",
  statusNext: "#d97706",
  statusCompleted: "#16a34a",
  statusPending: "#94a3b8",
  connected: "#059669",
  disconnected: "#dc2626"
};

export function getColors(mode: ThemeMode): PadelColors {
  return mode === "light" ? lightColors : darkColors;
}

/** CSS custom property map for Next.js globals.css */
export function colorsToCssVariables(colors: PadelColors): Record<string, string> {
  return {
    "--padel-background": colors.background,
    "--padel-surface": colors.surface,
    "--padel-surface-alt": colors.surfaceAlt,
    "--padel-text": colors.text,
    "--padel-muted": colors.muted,
    "--padel-primary": colors.primary,
    "--padel-on-primary": colors.onPrimary,
    "--padel-danger": colors.danger,
    "--padel-border": colors.border,
    "--padel-status-live": colors.statusLive,
    "--padel-status-next": colors.statusNext,
    "--padel-status-completed": colors.statusCompleted,
    "--padel-status-pending": colors.statusPending,
    "--padel-connected": colors.connected,
    "--padel-disconnected": colors.disconnected
  };
}
