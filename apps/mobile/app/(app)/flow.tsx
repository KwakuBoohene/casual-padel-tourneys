import { PageShell } from "../../src/layout";
import { OrganizerSignedInBody } from "../../src/components/organizer/OrganizerSignedInBody";
import { useOrganizerSession } from "../../src/providers/OrganizerSessionProvider";

/**
 * Temporary host for create / live / KOH / account-players until tickets 04–05.
 */
export default function OrganizerFlowRoute() {
  const org = useOrganizerSession();

  return (
    <PageShell>
      <OrganizerSignedInBody org={org} />
    </PageShell>
  );
}
