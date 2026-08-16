import { PageShell } from "../../src/layout";
import { OrganizerSignedInBody } from "../../src/components/organizer/OrganizerSignedInBody";
import { useOrganizerSession } from "../../src/providers/OrganizerSessionProvider";

/** Temp host for KOH create/live and account-players. */
export default function OrganizerFlowRoute() {
  const org = useOrganizerSession();

  return (
    <PageShell>
      <OrganizerSignedInBody org={org} />
    </PageShell>
  );
}
