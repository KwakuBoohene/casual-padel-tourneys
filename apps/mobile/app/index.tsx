import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { parseAuthDeepLink } from "../src/api/authDeepLink";
import { logger } from "../src/logger";
import { useAuthSessionContext } from "../src/providers/AuthSessionProvider";
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

/** Root entry: auth redirects, then signed-in users land on tournament list. */
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

  return <Redirect href="/tournaments" />;
}
