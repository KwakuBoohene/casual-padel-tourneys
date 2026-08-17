import { router } from "expo-router";

import { PlayerManagementFlow } from "../../../src/components/playerManagement/PlayerManagementFlow";
import { useOrganizerSession } from "../../../src/providers/OrganizerSessionProvider";

export default function ProfilePlayersRoute() {
  const org = useOrganizerSession();

  return (
    <PlayerManagementFlow
      setErrorText={org.setErrorText}
      markEmailVerifyRequired={org.markEmailVerifyRequired}
      onBack={() => router.replace("/profile")}
      onAttach={org.currentUser?.isGuest ? () => router.push("/profile/attach") : undefined}
    />
  );
}
