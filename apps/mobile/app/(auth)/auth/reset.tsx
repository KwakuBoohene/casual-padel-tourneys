import { router, useLocalSearchParams } from "expo-router";

import { ResetPasswordScreen } from "../../../src/screens/ResetPasswordScreen";
import { useAuthSessionContext } from "../../../src/providers/AuthSessionProvider";

export default function ResetPasswordRoute() {
  const auth = useAuthSessionContext();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const tokenParam = params.token;
  const resetToken = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  return (
    <ResetPasswordScreen
      resetToken={resetToken ?? null}
      onBack={() => router.replace("/password")}
      onSignedIn={async (session) => {
        await auth.handleSignedIn(session);
        router.replace("/");
      }}
    />
  );
}
