import { Pressable, Text, TextInput, View } from "react-native";

import type { AuthSession } from "../../api/auth";
import { useBreakpoint } from "../../layout";
import { radius, spacing, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { AuthErrorSheet } from "../SignInScreen/components/AuthErrorSheet";
import { AuthMethodButton } from "../SignInScreen/components/AuthMethodButton";

import { usePasswordAuth } from "./hooks/usePasswordAuth";

interface PasswordScreenProps {
  onBack: () => void;
  onSignedIn: (session: AuthSession) => void;
  onForgotPassword: () => void;
}

export function PasswordScreen(props: PasswordScreenProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const auth = usePasswordAuth(props.onSignedIn);

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
        <Text style={[typography.title, { color: colors.text }]}>Email and password</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <AuthMethodButton
            label="Sign in"
            variant={auth.mode === "login" ? "primary" : "secondary"}
            onPress={() => auth.setMode("login")}
          />
          <AuthMethodButton
            label="Create account"
            variant={auth.mode === "register" ? "primary" : "secondary"}
            onPress={() => auth.setMode("register")}
          />
        </View>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={colors.muted}
          value={auth.email}
          onChangeText={auth.setEmail}
          style={inputStyle(colors)}
        />
        <TextInput
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={colors.muted}
          value={auth.password}
          onChangeText={auth.setPassword}
          style={inputStyle(colors)}
        />
        <AuthMethodButton
          label={auth.mode === "login" ? "Sign in" : "Create account"}
          variant="primary"
          loading={auth.loading}
          disabled={auth.loading}
          onPress={() => {
            void auth.submit();
          }}
        />
        <Pressable onPress={props.onForgotPassword}>
          <Text style={{ color: colors.muted, fontWeight: "600", textAlign: "center" }}>
            Forgot password?
          </Text>
        </Pressable>
      </View>
      <AuthErrorSheet
        visible={Boolean(auth.errorMessage)}
        message={auth.errorMessage ?? ""}
        onDismiss={auth.clearError}
      />
    </View>
  );
}

function inputStyle(colors: { border: string; surface: string; text: string }) {
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
