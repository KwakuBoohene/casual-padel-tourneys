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
  invitationOrganizerName?: string;
  onCheckVerification: () => Promise<boolean>;
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
      if (await props.onCheckVerification()) return;
      const result = await resendVerificationEmail();
      setInfoMessage(result.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not resend verification email.");
    } finally {
      setLoading(false);
    }
  }

  async function onCheck() {
    setLoading(true);
    try {
      if (!(await props.onCheckVerification())) {
        setInfoMessage("Your email is not verified yet. Open the verification link in your email.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not check email verification.");
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
        justifyContent: "flex-start",
        padding: spacing.lg
      }}
    >
      <View style={{ width: "100%", maxWidth: formMaxWidth, gap: spacing.lg, paddingTop: spacing.xxl }}>
        {props.invitationOrganizerName ? (
          <View style={{ alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Text style={{ color: colors.statusNext, fontWeight: "700", fontSize: 12 }}>●  Invitation saved</Text>
          </View>
        ) : null}
        <Text style={[typography.title, { color: colors.text, fontSize: 28 }]}>Verify your email</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>
          {props.invitationOrganizerName
            ? "We’ll keep your manager invitation ready while you verify."
            : `Confirm ${props.email ? props.email : "your email"} to keep organizing tournaments.`}
          {dueLabel ? ` Verification was due by ${dueLabel}.` : ""}
        </Text>
        {props.invitationOrganizerName ? (
          <View style={{ borderLeftWidth: 4, borderLeftColor: colors.primary, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.xs }}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>{props.invitationOrganizerName} · Manager</Text>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>Create tournaments, manage players, update scores and export results.</Text>
          </View>
        ) : null}
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>Check your inbox</Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>Verification was sent to{"\n"}<Text style={{ color: colors.text, fontWeight: "600" }}>{props.email ?? "your email"}</Text></Text>
        <AuthMethodButton label="Resend verification email" variant="primary" loading={loading} disabled={loading} onPress={() => { void onResend(); }} />
        <AuthMethodButton
          label="I’ve verified — check again"
          variant="secondary"
          loading={loading}
          disabled={loading}
          onPress={() => { void onCheck(); }}
        />
        <Text style={{ color: colors.muted, fontSize: 12 }}>We also check automatically while this screen is open.</Text>
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
          <Text style={{ color: colors.text, fontWeight: "600" }}>{props.invitationOrganizerName ? "Switch account" : "Sign out"}</Text>
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
