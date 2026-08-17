import { Redirect, router } from "expo-router";

import { KohLiveHub } from "../../../src/components/koh/live/KohLiveHub";
import { PageShell } from "../../../src/layout";
import { useOrganizerSession } from "../../../src/providers/OrganizerSessionProvider";

export default function KohLiveRoute() {
  const org = useOrganizerSession();

  if (!org.kohHub) {
    return <Redirect href="/tournaments" />;
  }

  return (
    <PageShell>
      <KohLiveHub
        hub={org.kohHub}
        setHub={org.setKohHub}
        setErrorText={org.setErrorText}
        markEmailVerifyRequired={org.markEmailVerifyRequired}
        viewerBaseUrl={org.viewerBaseUrl}
        onBackToList={() => {
          org.clearKohHub();
          router.replace("/tournaments");
        }}
      />
    </PageShell>
  );
}
