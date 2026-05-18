"use client";

import { useThemeMode } from "../app/ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { mode, toggleMode } = useThemeMode();
  const isLight = mode === "light";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? "Switch to dark mode" : "Switch to day mode"}
      onClick={toggleMode}
      className={`inline-flex items-center gap-2 rounded-full border border-padel-border bg-padel-surface px-3 py-1.5 text-xs font-semibold text-padel-text transition hover:bg-padel-surfaceAlt ${className}`}
    >
      <span aria-hidden>{isLight ? "☀️" : "🌙"}</span>
      <span>{isLight ? "Day" : "Dark"}</span>
    </button>
  );
}
