import { router } from "expo-router";

import { PageShell } from "../../../src/layout";
import { ProfileScreen } from "../../../src/screens/ProfileScreen";
import { useOrganizerSession } from "../../../src/providers/OrganizerSessionProvider";

export default function ProfileRoute() {
  const org = useOrganizerSession();

  if (!org.currentUser) {
    return null;
  }

  return (
    <PageShell>
      <ProfileScreen
        user={org.currentUser}
        onBack={() => router.replace("/tournaments")}
        onSignOut={async () => {
          await org.handleSignOut();
          router.replace("/sign-in");
        }}
        onAttachAccount={() => router.push("/profile/attach")}
      />
    </PageShell>
  );
}
