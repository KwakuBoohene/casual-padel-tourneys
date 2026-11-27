import { z } from "zod";

import type { DraftRole } from "./tournamentDraft.js";

export const inviteDraftEditorSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254)
});

/** Invite tokens travel in request bodies (never URLs) so they stay out of logs. */
export const draftInvitationTokenSchema = z.object({ token: z.string().min(40).max(128) });

export const updateDraftSettingsSchema = z.object({
  keepAccessAfterStart: z.boolean()
});

export const DRAFT_INVITATION_LIFETIME_DAYS = 7;
/** Invites + resends per draft per hour. */
export const DRAFT_INVITATIONS_PER_HOUR = 10;
export const DRAFT_PENDING_INVITATIONS_MAX = 10;

export interface DraftPerson {
  userId: string;
  name: string;
  email: string;
  role: DraftRole;
  addedAt?: string;
}

export interface DraftPendingInvitation {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  deliveryStatus: string;
}

/** `GET /drafts/:id/people` — who can open this draft and what the caller may change. */
export interface DraftPeople {
  owner: DraftPerson;
  editors: DraftPerson[];
  invitations: DraftPendingInvitation[];
  keepAccessAfterStart: boolean;
  viewerRole: DraftRole;
  can: { managePeople: boolean; deleteDraft: boolean; changeSettings: boolean };
}

/** `POST /draft-invitations/preview` — safe to show before sign-in (no payload). */
export interface DraftInvitationPreview {
  draftName: string;
  mode: string;
  ownerName: string;
  invitedByName: string;
  invitedEmail: string;
  playerCount: number;
  expiresAt: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
}
