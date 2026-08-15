import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { consumeMagicLink, type AuthSession, type AuthUser } from "../../api/auth";
import { useAuthDeepLink } from "../../hooks/useAuthDeepLink";
import { useTheme } from "../../theme/ThemeProvider";
import { AttachAccountScreen } from "../../screens/AttachAccountScreen";
import { MagicLinkConsumeScreen } from "../../screens/MagicLinkConsumeScreen";
import { PasswordScreen } from "../../screens/PasswordScreen";
import { ResetPasswordScreen } from "../../screens/ResetPasswordScreen";
import { SignInScreen } from "../../screens/SignInScreen";
import { VerifyGateScreen } from "../../screens/VerifyGateScreen";

type UnauthView = "signin" | "password" | "reset";

export interface OrganizerAuthGateProps {
  authReady: boolean;
  authToken: string | null;
  currentUser: AuthUser | null;
  emailVerifyRequired: boolean;
  verifyBy?: number;
  step: string;
  onSignedIn: (session: AuthSession) => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onUpdateUser: (user: AuthUser) => void | Promise<void>;
  onClearEmailVerifyRequired: () => void;
  onSetStep: (step: "LIST" | "PROFILE" | "ATTACH") => void;
  children: React.ReactNode;
}

export function OrganizerAuthGate(props: OrganizerAuthGateProps) {
  const { colors } = useTheme();
  const [unauthView, setUnauthView] = useState<UnauthView>("signin");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [magicStatus, setMagicStatus] = useState<"idle" | "working" | "error">("idle");
  const [magicMessage, setMagicMessage] = useState<string | undefined>();
  const [pendingMagicToken, setPendingMagicToken] = useState<string | null>(null);

  const consumeMagic = useCallback(
    async (token: string) => {
      setPendingMagicToken(token);
      setMagicStatus("working");
      setMagicMessage(undefined);
      try {
        const session = await consumeMagicLink(token);
        props.onClearEmailVerifyRequired();
        await props.onSignedIn(session);
        setMagicStatus("idle");
        setPendingMagicToken(null);
        setUnauthView("signin");
      } catch (error) {
        setMagicStatus("error");
        setMagicMessage(error instanceof Error ? error.message : "Invalid or expired sign-in link.");
      }
    },
    [props.onClearEmailVerifyRequired, props.onSignedIn]
  );

  useAuthDeepLink({
    onMagicToken: (token) => {
      void consumeMagic(token);
    },
    onResetToken: (token) => {
      setResetToken(token);
      setUnauthView("reset");
    }
  });

  if (!props.authReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (magicStatus !== "idle") {
    return (
      <MagicLinkConsumeScreen
        status={magicStatus}
        message={magicMessage}
        onRetry={pendingMagicToken ? () => void consumeMagic(pendingMagicToken) : undefined}
        onDismiss={() => {
          setMagicStatus("idle");
          setPendingMagicToken(null);
        }}
      />
    );
  }

  if (!props.authToken || !props.currentUser) {
    if (unauthView === "password") {
      return (
        <PasswordScreen
          onBack={() => setUnauthView("signin")}
          onSignedIn={(s) => void props.onSignedIn(s)}
          onForgotPassword={() => {
            setResetToken(null);
            setUnauthView("reset");
          }}
        />
      );
    }
    if (unauthView === "reset") {
      return (
        <ResetPasswordScreen
          resetToken={resetToken}
          onBack={() => {
            setResetToken(null);
            setUnauthView("password");
          }}
          onSignedIn={(s) => void props.onSignedIn(s)}
        />
      );
    }
    return (
      <SignInScreen onSignedIn={(s) => void props.onSignedIn(s)} onPassword={() => setUnauthView("password")} />
    );
  }

  if (props.emailVerifyRequired) {
    return (
      <VerifyGateScreen
        email={props.currentUser.email}
        verifyBy={props.verifyBy}
        onSignOut={() => void props.onSignOut()}
      />
    );
  }

  if (props.step === "ATTACH") {
    return (
      <AttachAccountScreen
        onBack={() => props.onSetStep("PROFILE")}
        onAttached={(s) => {
          void props.onSignedIn(s);
          props.onSetStep("LIST");
        }}
        onEmailPending={(user) => void props.onUpdateUser(user)}
      />
    );
  }

  return <>{props.children}</>;
}
