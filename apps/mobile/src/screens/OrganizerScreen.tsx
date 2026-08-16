import { OrganizerSignedInBody } from "../components/organizer/OrganizerSignedInBody";
import { useOrganizerScreen } from "../hooks/organizer/useOrganizerScreen";

/**
 * Legacy monolith entry. Prefer Expo Router `(app)` routes; this remains
 * only until ticket 06 deletes the SetupStep switcher entirely.
 */
export function OrganizerScreen() {
  const org = useOrganizerScreen();
  return <OrganizerSignedInBody org={org} />;
}
