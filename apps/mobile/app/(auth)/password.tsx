import { router } from "expo-router";

import { PasswordScreen } from "../../src/screens/PasswordScreen";
import { useAuthSessionContext } from "../../src/providers/AuthSessionProvider";

export default function PasswordRoute() {
  const auth = useAuthSessionContext();

  return (
    <PasswordScreen
      onBack={() => router.replace("/sign-in")}
      onSignedIn={async (session) => {
        await auth.handleSignedIn(session);
        router.replace("/");
      }}
      onForgotPassword={() => router.push("/auth/reset")}
    />
  );
}
