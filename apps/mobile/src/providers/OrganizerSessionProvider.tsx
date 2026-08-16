import { createContext, useContext, type ReactNode } from "react";

import { useOrganizerScreen } from "../hooks/organizer/useOrganizerScreen";

type OrganizerSessionValue = ReturnType<typeof useOrganizerScreen>;

const OrganizerSessionContext = createContext<OrganizerSessionValue | null>(null);

export function OrganizerSessionProvider({ children }: { children: ReactNode }) {
  const value = useOrganizerScreen();
  return (
    <OrganizerSessionContext.Provider value={value}>{children}</OrganizerSessionContext.Provider>
  );
}

export function useOrganizerSession(): OrganizerSessionValue {
  const value = useContext(OrganizerSessionContext);
  if (!value) {
    throw new Error("useOrganizerSession must be used within OrganizerSessionProvider.");
  }
  return value;
}
