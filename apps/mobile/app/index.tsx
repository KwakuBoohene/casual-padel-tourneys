import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import * as Linking from "expo-linking";
import { Redirect, router } from "expo-router";

import { parseAuthDeepLink } from "../src/api/authDeepLink";
import { PageShell } from "../src/layout";
import { logger } from "../src/logger";
import { useAuthSessionContext } from "../src/providers/AuthSessionProvider";
import { OrganizerScreen } from "../src/screens/OrganizerScreen";
import { useTheme } from "../src/theme/ThemeProvider";

function redirectAuthUrl(url: string | null): void {
  if (!url) return;
  const link = parseAuthDeepLink(url);
  if (!link) return;
  logger.info("auth deep link → route", { kind: link.kind });
  if (link.kind === "magic") {
    router.replace({ pathname: "/auth/magic", params: { token: link.token } });
  } else {
    router.replace({ pathname: "/auth/reset", params: { token: link.token } });
  }
}

/**
 * Signed-in home. Auth screens live under `app/(auth)/` (ticket 02).
 * Tournament URL split comes in tickets 03–05.
 */
export default function Index() {
  const { colors } = useTheme();
  const auth = useAuthSessionContext();

  useEffect(() => {
    void Linking.getInitialURL().then(redirectAuthUrl);
    const sub = Linking.addEventListener("url", (event) => redirectAuthUrl(event.url));
    return () => sub.remove();
  }, []);

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

  return (
    <PageShell>
      <OrganizerScreen />
    </PageShell>
  );
}
