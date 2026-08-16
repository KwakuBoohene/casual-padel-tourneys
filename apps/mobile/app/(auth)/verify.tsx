import { router } from "expo-router";

import { VerifyGateScreen } from "../../src/screens/VerifyGateScreen";
import { useAuthSessionContext } from "../../src/providers/AuthSessionProvider";

export default function VerifyRoute() {
  const auth = useAuthSessionContext();

  return (
    <VerifyGateScreen
      email={auth.currentUser?.email}
      verifyBy={auth.verifyBy}
      onSignOut={async () => {
        await auth.handleSignOut();
        router.replace("/sign-in");
      }}
    />
  );
}
