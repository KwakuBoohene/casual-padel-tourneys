import { destinationAfterSignIn } from "../../../src/api/pendingOrganizerInvite";
import { router } from "expo-router";

import { AttachAccountScreen } from "../../../src/screens/AttachAccountScreen";
import { useOrganizerSession } from "../../../src/providers/OrganizerSessionProvider";

export default function ProfileAttachRoute() {
  const org = useOrganizerSession();

  return (
    <AttachAccountScreen
      onBack={() => router.replace("/profile")}
      onAttached={async (session) => {
        await org.handleSignedIn(session);
        router.replace(await destinationAfterSignIn());
      }}
      onEmailPending={(user) => void org.updateUser(user)}
    />
  );
}
