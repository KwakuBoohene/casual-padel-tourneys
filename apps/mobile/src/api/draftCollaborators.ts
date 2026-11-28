import type { DraftInvitationPreview, DraftPendingInvitation, DraftPeople } from "@padel/shared";

import { apiDelete, apiPatch, apiPost } from "./client";

const base = (draftId: string) => `/drafts/${encodeURIComponent(draftId)}`;

export const inviteDraftEditor = (draftId: string, email: string) =>
  apiPost<{ data: DraftPendingInvitation }>(`${base(draftId)}/invitations`, { email });

export const resendDraftInvitation = (draftId: string, invitationId: string) =>
  apiPost<{ data: DraftPendingInvitation }>(
    `${base(draftId)}/invitations/${encodeURIComponent(invitationId)}/resend`,
    {}
  );

export const revokeDraftInvitation = (draftId: string, invitationId: string) =>
  apiDelete<{ ok: true }>(`${base(draftId)}/invitations/${encodeURIComponent(invitationId)}`);

export const removeDraftEditor = (draftId: string, userId: string) =>
  apiDelete<{ ok: true }>(`${base(draftId)}/collaborators/${encodeURIComponent(userId)}`);

export const updateDraftSettings = (draftId: string, keepAccessAfterStart: boolean) =>
  apiPatch<{ data: DraftPeople }>(`${base(draftId)}/settings`, { keepAccessAfterStart });

/** Invite tokens travel in request bodies only, never in URLs. */
export const previewDraftInvitation = (token: string) =>
  apiPost<{ data: DraftInvitationPreview }>("/draft-invitations/preview", { token }).then((response) => response.data);

export const acceptDraftInvitation = (token: string) =>
  apiPost<{ data: { draftId: string; organizerId: string } }>("/draft-invitations/accept", { token }).then(
    (response) => response.data
  );

export const declineDraftInvitation = (token: string) =>
  apiPost<{ data: { declined: true } }>("/draft-invitations/decline", { token });
