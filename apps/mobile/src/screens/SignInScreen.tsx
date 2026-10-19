import { Text, View } from "react-native";

import type { AuthSession } from "../api/auth";
import { useBreakpoint } from "../layout";
import { spacing, typography } from "../theme";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTheme } from "../theme/ThemeProvider";

import { AuthErrorSheet } from "../components/auth/AuthErrorSheet";
import { SessionExpiredNotice } from "../components/auth/SessionExpiredNotice";
import { AuthMethodList } from "../components/auth/AuthMethodList";
import { MagicLinkPanel } from "../components/auth/MagicLinkPanel";
import { useSignIn } from "../hooks/auth/useSignIn";

interface SignInScreenProps {
  onSignedIn: (session: AuthSession) => void;
  onPassword: () => void;
  onForgotPassword?: () => void;
  sessionExpired?: boolean;
}

export function SignInScreen(props: SignInScreenProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const signIn = useSignIn({ onSignedIn: props.onSignedIn });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
        gap: spacing.lg
      }}
    >
      <View style={{ alignItems: "center", gap: spacing.sm, width: "100%", maxWidth: formMaxWidth }}>
        <ThemeToggle compact />
        {props.sessionExpired ? <SessionExpiredNotice /> : null}
        <Text style={[typography.title, { color: colors.text }]}>Casual Padel Tourneys</Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>Sign in to manage your tournaments.</Text>
      </View>

      <View style={{ width: "100%", maxWidth: formMaxWidth }}>
        {signIn.view === "magic" ? (
          <MagicLinkPanel
            loading={signIn.magicLoading}
            sentMessage={signIn.magicSentMessage}
            onBack={() => signIn.setView("methods")}
            onSend={(email) => {
              void signIn.sendMagicLink(email);
            }}
          />
        ) : (
          <AuthMethodList
            googleReady={signIn.googleReady}
            googleLoading={signIn.googleLoading}
            guestLoading={signIn.guestLoading}
            onGoogle={signIn.promptGoogle}
            onMagicLink={() => signIn.setView("magic")}
            onPassword={props.onPassword}
            onGuest={() => {
              void signIn.continueAsGuest();
            }}
          />
        )}
      </View>

      <AuthErrorSheet
        visible={Boolean(signIn.errorMessage)}
        message={signIn.errorMessage ?? ""}
        onDismiss={signIn.clearError}
      />
    </View>
  );
}
