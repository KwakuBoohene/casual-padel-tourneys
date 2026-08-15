import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { resendVerificationEmail } from "../api/auth";
import { useBreakpoint } from "../layout";
import { radius, spacing, typography } from "../theme";
import { useTheme } from "../theme/ThemeProvider";
import { AuthErrorSheet } from "../components/auth/AuthErrorSheet";
import { AuthMethodButton } from "../components/auth/AuthMethodButton";

interface VerifyGateScreenProps {
  email?: string;
  verifyBy?: number;
  onSignOut: () => void;
}

export function VerifyGateScreen(props: VerifyGateScreenProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dueLabel =
    props.verifyBy != null
      ? new Date(props.verifyBy).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short"
        })
      : null;

  async function onResend() {
    setLoading(true);
    try {
      const result = await resendVerificationEmail();
      setInfoMessage(result.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not resend verification email.");
    } finally {
      setLoading(false);
    }
  }

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
      <View style={{ width: "100%", maxWidth: formMaxWidth, gap: spacing.md }}>
        <Text style={[typography.title, { color: colors.text }]}>Verify your email</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>
          Confirm {props.email ? props.email : "your email"} to keep organizing tournaments.
          {dueLabel ? ` Verification was due by ${dueLabel}.` : ""}
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Open the link we emailed you, or resend a fresh one.
        </Text>
        <AuthMethodButton
          label="Resend verification email"
          variant="primary"
          loading={loading}
          disabled={loading}
          onPress={() => {
            void onResend();
          }}
        />
        {infoMessage ? (
          <Text style={{ color: colors.text, lineHeight: 20 }}>{infoMessage}</Text>
        ) : null}
        <Pressable
          onPress={props.onSignOut}
          style={{
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Sign out</Text>
        </Pressable>
      </View>
      <AuthErrorSheet
        visible={Boolean(errorMessage)}
        message={errorMessage ?? ""}
        onDismiss={() => setErrorMessage(null)}
      />
    </View>
  );
}
