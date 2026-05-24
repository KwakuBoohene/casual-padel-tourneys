import { THEME_STORAGE_KEY, getColors, type PadelColors, type ThemeMode } from "@padel/shared/theme";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { getCardStyles } from "../theme";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: PadelColors;
  cardStyles: ReturnType<typeof getCardStyles>;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function readStoredMode(): Promise<ThemeMode> {
  try {
    if (Platform.OS === "web") {
      const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
      return stored === "light" ? "light" : "dark";
    }
    const stored = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

async function writeStoredMode(mode: ThemeMode): Promise<void> {
  try {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, mode);
      return;
    }
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore persistence errors
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    void readStoredMode().then(setModeState);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void writeStoredMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next: ThemeMode = current === "dark" ? "light" : "dark";
      void writeStoredMode(next);
      return next;
    });
  }, []);

  const colors = getColors(mode);
  const cardStyles = getCardStyles(colors);

  const value = useMemo(
    () => ({
      mode,
      colors,
      cardStyles,
      setMode,
      toggleMode
    }),
    [mode, colors, cardStyles, setMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
