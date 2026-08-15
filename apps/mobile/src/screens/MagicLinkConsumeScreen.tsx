import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useBreakpoint } from "../../layout";
import { radius, spacing, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface MagicLinkConsumeScreenProps {
  status: "working" | "error";
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function MagicLinkConsumeScreen(props: MagicLinkConsumeScreenProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg
      }}
    >
      <View style={{ width: "100%", maxWidth: formMaxWidth, gap: spacing.md, alignItems: "center" }}>
        <Text style={[typography.title, { color: colors.text, textAlign: "center" }]}>
          {props.status === "working" ? "Signing you in…" : "Sign-in link issue"}
        </Text>
        {props.status === "working" ? <ActivityIndicator color={colors.primary} /> : null}
        {props.message ? (
          <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 20 }}>{props.message}</Text>
        ) : null}
        {props.status === "error" && props.onRetry ? (
          <Pressable
            onPress={props.onRetry}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.md,
              backgroundColor: colors.primary
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Try again</Text>
          </Pressable>
        ) : null}
        {props.status === "error" && props.onDismiss ? (
          <Pressable onPress={props.onDismiss}>
            <Text style={{ color: colors.muted, fontWeight: "600" }}>Back to sign in</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
