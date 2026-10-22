import type { OrganizerRole } from "@padel/shared";

export type OrganizerOperation = "manage" | "deleteTournament" | "manageMembers";
export function organizerCapabilities(role: OrganizerRole) {
  return { manage: true, deleteTournament: role === "OWNER", manageMembers: role === "OWNER" };
}
export function sharedOrganizerAccessEnabled(): boolean {
  return process.env.SHARED_ORGANIZER_ACCESS_ENABLED === "true";
}
