import { router } from "expo-router";

import { PageShell } from "../../../src/layout";
import { useOrganizerSession } from "../../../src/providers/OrganizerSessionProvider";
import { KohScreen } from "../../../src/screens/KohScreen";

export default function KohCreateRoute() {
  const org = useOrganizerSession();

  return (
    <PageShell>
      <KohScreen
        setErrorText={org.setErrorText}
        markEmailVerifyRequired={org.markEmailVerifyRequired}
        onCancel={() => {
          org.clearKohHub();
          router.replace("/tournaments");
        }}
        onStarted={(hub) => {
          org.adoptKohHub(hub);
          void org.loadTournaments();
          router.replace("/koh/live");
        }}
      />
    </PageShell>
  );
}
