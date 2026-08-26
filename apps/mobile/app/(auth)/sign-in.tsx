import { router } from "expo-router";

import { SignInScreen } from "../../src/screens/SignInScreen";
import { useAuthSessionContext } from "../../src/providers/AuthSessionProvider";

export default function SignInRoute() {
  const auth = useAuthSessionContext();

  return (
    <SignInScreen
      onSignedIn={async (session) => {
        await auth.handleSignedIn(session);
        router.replace("/");
      }}
      onPassword={() => router.push("/password")}
      sessionExpired={auth.sessionExpired}
    />
  );
}
