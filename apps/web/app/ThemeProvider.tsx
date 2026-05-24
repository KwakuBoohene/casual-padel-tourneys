"use client";

import { THEME_STORAGE_KEY, type ThemeMode } from "@padel/shared";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }
  const documentTheme = document.documentElement.dataset.theme;
  if (documentTheme === "light" || documentTheme === "dark") {
    return documentTheme;
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

function applyModeToDocument(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
}

function persistMode(mode: ThemeMode) {
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  document.cookie = `${THEME_STORAGE_KEY}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyModeToDocument(next);
    persistMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next: ThemeMode = current === "dark" ? "light" : "dark";
      applyModeToDocument(next);
      persistMode(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode
    }),
    [mode, setMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return ctx;
}
