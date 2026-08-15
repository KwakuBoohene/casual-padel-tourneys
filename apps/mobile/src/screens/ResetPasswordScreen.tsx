import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import {
  consumePasswordReset,
  requestPasswordReset,
  type AuthSession
} from "../../api/auth";
import { finishPasswordReset } from "../../api/passwordAttachReset";
import { useBreakpoint } from "../../layout";
import { radius, spacing, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { AuthErrorSheet } from "../SignInScreen/components/AuthErrorSheet";
import { AuthMethodButton } from "../SignInScreen/components/AuthMethodButton";

interface ResetPasswordScreenProps {
  /** Raw deep-link token; when set, consume → new password form. */
  resetToken?: string | null;
  onBack: () => void;
  onSignedIn: (session: AuthSession) => void;
}

export function ResetPasswordScreen(props: ResetPasswordScreenProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetTicket, setResetTicket] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!props.resetToken) {
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const result = await consumePasswordReset(props.resetToken!);
        setResetTicket(result.resetTicket);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Invalid or expired reset link.");
      } finally {
        setLoading(false);
      }
    })();
  }, [props.resetToken]);

  async function sendResetEmail() {
    setLoading(true);
    setInfoMessage(null);
    try {
      const result = await requestPasswordReset(email.trim().toLowerCase());
      setInfoMessage(result.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not send reset link.");
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword() {
    if (!resetTicket || password.length < 8) {
      setErrorMessage("Choose a password with at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      props.onSignedIn(await finishPasswordReset(resetTicket, password));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not reset password.");
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
        <Pressable onPress={props.onBack}>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>← Back</Text>
        </Pressable>
        <Text style={[typography.title, { color: colors.text }]}>Reset password</Text>
        {resetTicket ? (
          <>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>Choose a new password.</Text>
            <TextInput
              secureTextEntry
              placeholder="Password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.text,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                fontSize: 16
              }}
            />
            <AuthMethodButton
              label="Save new password"
              variant="primary"
              loading={loading}
              disabled={loading}
              onPress={() => {
                void submitNewPassword();
              }}
            />
          </>
        ) : (
          <>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              We will email a reset link if an account exists for that address.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.text,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                fontSize: 16
              }}
            />
            <AuthMethodButton
              label="Send reset link"
              variant="primary"
              loading={loading}
              disabled={loading || email.trim().length < 3}
              onPress={() => {
                void sendResetEmail();
              }}
            />
            {infoMessage ? (
              <Text style={{ color: colors.text, lineHeight: 20 }}>{infoMessage}</Text>
            ) : null}
          </>
        )}
      </View>
      <AuthErrorSheet
        visible={Boolean(errorMessage)}
        message={errorMessage ?? ""}
        onDismiss={() => setErrorMessage(null)}
      />
    </View>
  );
}
