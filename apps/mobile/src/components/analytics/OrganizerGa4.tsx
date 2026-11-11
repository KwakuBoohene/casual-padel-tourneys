import type { ReactNode } from "react";
import type { OrganizerGa4Action } from "@padel/shared";

export function OrganizerGa4({ children }: { children: ReactNode; allowed: boolean | null }) {
  return <>{children}</>;
}

const ignoreEvent = (_action: OrganizerGa4Action): boolean => false;
export function useOrganizerGa4() {
  return ignoreEvent;
}
