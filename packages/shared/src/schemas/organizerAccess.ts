import { z } from "zod";

export const inviteOrganizerManagerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.literal("MANAGER").default("MANAGER")
});
export const organizerInvitationTokenSchema = z.object({ token: z.string().min(40).max(128) });
export type OrganizerRole = "OWNER" | "MANAGER";
export interface OrganizerAccount {
  id: string;
  name: string;
  role: OrganizerRole;
  capabilities: { manage: boolean; deleteTournament: boolean; manageMembers: boolean };
}
export interface OrganizerAccessOverview {
  owner: { id: string; name: string };
  members: Array<{ id: string; name: string; email: string; acceptedAt: string }>;
  invitations: Array<{ id: string; email: string; expiresAt: string; deliveryStatus: string }>;
}
export interface OrganizerActivityEntry {
  id: string;
  actorName: string;
  action: string;
  targetId: string | null;
  occurredAt: string;
  metadata: Record<string, unknown> | null;
}
