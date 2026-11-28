import { useOrganizerGa4 } from "../../../src/components/analytics/OrganizerGa4";
import { router, useLocalSearchParams } from "expo-router";

import { PageShell } from "../../../src/layout";
import { useOrganizerSession } from "../../../src/providers/OrganizerSessionProvider";
import { KohScreen } from "../../../src/screens/KohScreen";
import type { KohCreateStep } from "../../../src/types/koh/create";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const STEPS: KohCreateStep[] = ["NAME", "PAIRING", "FORMAT", "DEUCE", "COURTS", "PROMOTION", "ASSIGN", "REVIEW"];

export default function KohCreateRoute() {
  const sendAnalytics = useOrganizerGa4();
  const org = useOrganizerSession();
  const params = useLocalSearchParams<{ draft?: string | string[]; step?: string | string[]; from?: string | string[] }>();
  const draftId = first(params.draft);
  const fromOverview = Boolean(draftId) && first(params.from) === "overview";

  return (
    <PageShell>
      <KohScreen
        draftId={draftId}
        initialStep={STEPS.find((step) => step === first(params.step))}
        setErrorText={org.setErrorText}
        markEmailVerifyRequired={org.markEmailVerifyRequired}
        onCancel={() => {
          org.clearKohHub();
          // Editing a section from the draft overview returns there (it refetches on focus).
          if (fromOverview && draftId) router.replace({ pathname: "/drafts/[id]", params: { id: draftId } });
          else router.replace("/tournaments");
        }}
        onStarted={(hub) => {
          org.adoptKohHub(hub);
          sendAnalytics({ event: "creation_succeeded" });
          void org.loadTournaments();
          router.replace("/koh/live");
        }}
      />
    </PageShell>
  );
}
