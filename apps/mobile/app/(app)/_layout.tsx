import type { ReactNode } from "react";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { OrganizerSessionProvider } from "../../src/providers/OrganizerSessionProvider";
import { useAuthSessionContext } from "../../src/providers/AuthSessionProvider";
import { useTheme } from "../../src/theme/ThemeProvider";

function AppAuthGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const auth = useAuthSessionContext();

  if (!auth.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!auth.authToken || !auth.currentUser) {
    return <Redirect href="/sign-in" />;
  }

  if (auth.emailVerifyRequired) {
    return <Redirect href="/verify" />;
  }

  return <>{children}</>;
}

export default function AppLayout() {
  return (
    <AppAuthGate>
      <OrganizerSessionProvider>
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
      </OrganizerSessionProvider>
    </AppAuthGate>
  );
}
