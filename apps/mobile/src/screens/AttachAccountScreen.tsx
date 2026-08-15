import { Pressable, Text, TextInput, View } from "react-native";

import type { AuthSession, AuthUser } from "../api/auth";
import { useBreakpoint } from "../layout";
import { radius, spacing, typography } from "../theme";
import { useTheme } from "../theme/ThemeProvider";
import { AuthErrorSheet } from "../components/auth/AuthErrorSheet";
import { AuthMethodButton } from "../components/auth/AuthMethodButton";
import { useAttachAccount } from "../hooks/auth/useAttachAccount";

interface AttachAccountScreenProps {
  onBack: () => void;
  onAttached: (session: AuthSession) => void;
  onEmailPending: (user: AuthUser, message: string) => void;
}

export function AttachAccountScreen(props: AttachAccountScreenProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const attach = useAttachAccount({
    onAttached: props.onAttached,
    onEmailPending: props.onEmailPending
  });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        alignItems: "center"
      }}
    >
      <View style={{ width: "100%", maxWidth: formMaxWidth, gap: spacing.md, marginTop: spacing.xl }}>
        <Pressable onPress={props.onBack}>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>← Back</Text>
        </Pressable>
        <Text style={[typography.title, { color: colors.text }]}>Keep your tournaments</Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Attach an email, Google, or password so this guest account stays yours.
        </Text>

        {attach.mode === "menu" ? (
          <View style={{ gap: spacing.md }}>
            <AuthMethodButton
              label="Continue with Google"
              variant="primary"
              disabled={!attach.googleReady || attach.loading}
              loading={attach.loading}
              onPress={attach.promptGoogle}
            />
            <AuthMethodButton label="Attach email" onPress={() => attach.setMode("email")} />
            <AuthMethodButton label="Attach password" onPress={() => attach.setMode("password")} />
          </View>
        ) : null}

        {attach.mode === "email" ? (
          <View style={{ gap: spacing.md }}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={colors.muted}
              value={attach.email}
              onChangeText={attach.setEmail}
              style={fieldStyle(colors)}
            />
            <AuthMethodButton
              label="Send confirmation link"
              variant="primary"
              loading={attach.loading}
              onPress={() => {
                void attach.submitEmail();
              }}
            />
            {attach.infoMessage ? (
              <Text style={{ color: colors.text, lineHeight: 20 }}>{attach.infoMessage}</Text>
            ) : null}
            <Pressable onPress={() => attach.setMode("menu")}>
              <Text style={{ color: colors.muted, fontWeight: "600" }}>Other options</Text>
            </Pressable>
          </View>
        ) : null}

        {attach.mode === "password" ? (
          <View style={{ gap: spacing.md }}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={colors.muted}
              value={attach.email}
              onChangeText={attach.setEmail}
              style={fieldStyle(colors)}
            />
            <TextInput
              secureTextEntry
              placeholder="Password"
              placeholderTextColor={colors.muted}
              value={attach.password}
              onChangeText={attach.setPassword}
              style={fieldStyle(colors)}
            />
            <AuthMethodButton
              label="Save password"
              variant="primary"
              loading={attach.loading}
              onPress={() => {
                void attach.submitPassword();
              }}
            />
            <Pressable onPress={() => attach.setMode("menu")}>
              <Text style={{ color: colors.muted, fontWeight: "600" }}>Other options</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <AuthErrorSheet
        visible={Boolean(attach.errorMessage)}
        message={attach.errorMessage ?? ""}
        onDismiss={attach.clearError}
      />
    </View>
  );
}

function fieldStyle(colors: { border: string; surface: string; text: string }) {
  return {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16
  };
}
