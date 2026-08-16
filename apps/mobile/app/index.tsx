import { PageShell } from "../src/layout";
import { OrganizerScreen } from "../src/screens/OrganizerScreen";

/**
 * Temporary bootstrap until epic-07 tickets 02–05 split auth / tournament routes.
 * Product UX is unchanged: still the full OrganizerScreen tree.
 */
export default function Index() {
  return (
    <PageShell>
      <OrganizerScreen />
    </PageShell>
  );
}
