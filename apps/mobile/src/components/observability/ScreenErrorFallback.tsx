import { useEffect } from "react";
import { Text, View } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { ThemeProvider, useTheme } from "../../theme/ThemeProvider";
import { captureClientError } from "../../utilities/observability/sentry";
import { AccessButton } from "../organizerAccess/AccessButton";

function FallbackContent({ retry }: Pick<ErrorBoundaryProps, "retry">) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 24, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>
        Something went wrong
      </Text>
      <Text style={{ color: colors.muted }}>Please try opening this screen again.</Text>
      <AccessButton label="Try again" onPress={() => { void retry(); }} />
    </View>
  );
}

export function ScreenErrorFallback({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { captureClientError(error); }, [error]);
  // The router boundary can replace the root layout, including its providers.
  return <ThemeProvider><FallbackContent retry={retry} /></ThemeProvider>;
}
