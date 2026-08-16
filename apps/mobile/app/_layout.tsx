import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AuthSessionProvider } from "../src/providers/AuthSessionProvider";
import { useWebDocumentBackground } from "../src/layout/useWebDocumentBackground";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

function RootChrome({ children }: { children: ReactNode }) {
  const { mode, colors } = useTheme();
  const androidTopInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  useWebDocumentBackground(colors.background);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: androidTopInset }}>
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
          <AuthSessionProvider>
            <RootChrome>
              <RootStack />
            </RootChrome>
          </AuthSessionProvider>
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
