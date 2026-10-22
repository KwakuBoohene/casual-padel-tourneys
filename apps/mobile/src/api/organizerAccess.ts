import type { OrganizerAccount, OrganizerAccessOverview, OrganizerActivityEntry } from "@padel/shared";
import { apiGet, apiPost, apiDelete } from "./client";

export const fetchOrganizerAccounts = () =>
  apiGet<{ data: OrganizerAccount[]; sharedAccessEnabled?: boolean }>("/organizers");
export const fetchOrganizerAccess = (id: string) =>
  apiGet<{ data: OrganizerAccessOverview }>(`/organizers/${id}/members`);
export const inviteOrganizerManager = (id: string, email: string) =>
  apiPost<{ data: { deliveryStatus: string } }>(`/organizers/${id}/invitations`, { email, role: "MANAGER" });
export const resendOrganizerInvitation = (id: string, inviteId: string) =>
  apiPost(`/organizers/${id}/invitations/${inviteId}/resend`, {});
export const revokeOrganizerInvitation = (id: string, inviteId: string) =>
  apiDelete(`/organizers/${id}/invitations/${inviteId}`);
export const removeOrganizerManager = (id: string, memberId: string) =>
  apiDelete(`/organizers/${id}/members/${memberId}`);
export const previewOrganizerInvitation = (token: string) =>
  apiPost<{ data: { organizerName: string; invitedEmail: string; expiresAt: string; accepted: boolean } }>(
    "/organizer-invitations/preview",
    { token }
  );
export const acceptOrganizerInvitation = (token: string) =>
  apiPost<{ data: { organizerId: string } }>("/organizer-invitations/accept", { token });
export const fetchOrganizerActivity = (id: string, cursor?: string) =>
  apiGet<{ data: OrganizerActivityEntry[]; nextCursor: string | null }>(
    `/organizers/${id}/activity${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`
  );
