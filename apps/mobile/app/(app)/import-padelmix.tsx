import { router } from "expo-router";

import { useOrganizerGa4 } from "../../src/components/analytics/OrganizerGa4";
import { PadelMixImportView } from "../../src/components/organizer/import/PadelMixImportView";
import { usePadelMixImport } from "../../src/hooks/organizer/usePadelMixImport";
import { PageShell } from "../../src/layout";
import { useOrganizerSession } from "../../src/providers/OrganizerSessionProvider";

export default function ImportPadelMixRoute() {
  const org = useOrganizerSession();
  const sendAnalytics = useOrganizerGa4();
  const form = usePadelMixImport({
    markEmailVerifyRequired: org.markEmailVerifyRequired,
    adoptTournament: (data, editMode) => {
      org.adoptTournament(data, editMode);
      sendAnalytics({ event: "creation_succeeded" });
    }
  });

  return (
    <PageShell>
      <PadelMixImportView form={form} onBack={() => router.replace("/tournaments")} />
    </PageShell>
  );
}
