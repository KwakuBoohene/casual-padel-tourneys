import { router } from "expo-router";

import { AccountPlayersFlow } from "../../src/components/accountPlayers/AccountPlayersFlow";
import { PageShell } from "../../src/layout";
import { useOrganizerSession } from "../../src/providers/OrganizerSessionProvider";

export default function AccountPlayersRoute() {
  const org = useOrganizerSession();

  return (
    <PageShell>
      <AccountPlayersFlow
        isGuest={org.currentUser?.isGuest === true}
        errorText={org.errorText}
        setErrorText={org.setErrorText}
        markEmailVerifyRequired={org.markEmailVerifyRequired}
        onBack={() => router.replace("/tournaments")}
        onAttach={() => router.push("/profile/attach")}
      />
    </PageShell>
  );
}
