import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AuthSessionProvider } from "../src/providers/AuthSessionProvider";
import { QueryProvider } from "../src/providers/QueryProvider";
import { useWebDocumentBackground } from "../src/layout/useWebDocumentBackground";
import { useWebFocusRing } from "../src/layout/useWebFocusRing";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

function RootChrome({ children }: { children: ReactNode }) {
  const { mode, colors } = useTheme();
  useWebDocumentBackground(colors.background);
  useWebFocusRing();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} />
      {children}
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <AuthSessionProvider>
              <RootChrome>
                <RootStack />
              </RootChrome>
            </AuthSessionProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: colors.background }
      }}
    />
  );
}
