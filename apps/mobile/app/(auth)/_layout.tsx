import { Redirect, Stack, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuthSessionContext } from "../../src/providers/AuthSessionProvider";
import { useTheme } from "../../src/theme/ThemeProvider";

/**
 * Auth stack. Signed-in users are bounced home except while on verify
 * (email gate) or during magic-link consume.
 */
export default function AuthLayout() {
  const { colors } = useTheme();
  const auth = useAuthSessionContext();
  const pathname = usePathname();

  if (!auth.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const signedIn = Boolean(auth.authToken && auth.currentUser);
  const onMagic = pathname.includes("/auth/magic");
  const onVerify = pathname.includes("/verify");

  if (signedIn && !auth.emailVerifyRequired && !onMagic) {
    return <Redirect href="/" />;
  }

  if (signedIn && auth.emailVerifyRequired && !onVerify && !onMagic) {
    return <Redirect href="/verify" />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
