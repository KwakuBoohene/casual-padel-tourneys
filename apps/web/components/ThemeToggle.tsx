"use client";

import { useThemeMode } from "../app/ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { mode, toggleMode } = useThemeMode();
  const isLight = mode === "light";
  const buttonTone = isLight
    ? "border-padel-border bg-padel-surface text-padel-text hover:bg-padel-surfaceAlt"
    : "border-slate-700/70 bg-slate-900/70 text-slate-200 hover:bg-slate-800/80";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? "Switch to dark mode" : "Switch to day mode"}
      suppressHydrationWarning
      onClick={toggleMode}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${buttonTone} ${className}`}
    >
      <span aria-hidden>{isLight ? "☀️" : "🌙"}</span>
      <span>{isLight ? "Day" : "Dark"}</span>
    </button>
  );
}
