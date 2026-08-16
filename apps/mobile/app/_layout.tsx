import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

function RootChrome({ children }: { children: ReactNode }) {
  const { mode, colors } = useTheme();
  const androidTopInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

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
          <RootChrome>
            <Stack screenOptions={{ headerShown: false, contentStyle: { flex: 1 } }} />
          </RootChrome>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
