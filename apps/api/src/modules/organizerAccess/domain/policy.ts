import type { OrganizerRole } from "@padel/shared";

export type OrganizerOperation = "manage" | "deleteTournament" | "deleteDraft" | "manageMembers";
export function organizerCapabilities(role: OrganizerRole) {
  return {
    manage: true,
    deleteTournament: role === "OWNER",
    /** Account managers already manage every draft of the account. */
    deleteDraft: true,
    manageMembers: role === "OWNER"
  };
}
export function sharedOrganizerAccessEnabled(): boolean {
  return process.env.SHARED_ORGANIZER_ACCESS_ENABLED === "true";
}
