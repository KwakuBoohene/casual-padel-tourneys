import type { DraftRole } from "@padel/shared";

import { prisma } from "../../../lib/prisma.js";
import { conflict, notFound } from "../../../shared/kernel/appError.js";

/** Caller of a `/drafts/:id/…` people route, as resolved by organizer access. */
export interface DraftPeopleActor {
  organizerId: string;
  actorUserId: string;
  actorName: string;
  role: DraftRole;
}

export const pendingInvitationWhere = (now = new Date()) => ({
  acceptedAt: null,
  declinedAt: null,
  revokedAt: null,
  expiresAt: { gt: now }
});

/** Open (not deleted, not started) draft owned by the actor's resolved organizer. */
export async function loadOpenDraft(actor: DraftPeopleActor, draftId: string) {
  const draft = await prisma.tournamentDraft.findFirst({
    where: { id: draftId, deletedAt: null },
    select: {
      id: true,
      name: true,
      organizerId: true,
      startedTournamentId: true,
      keepAccessAfterStart: true,
      organizer: { select: { id: true, name: true, email: true } }
    }
  });
  if (!draft || draft.organizerId !== actor.organizerId) throw notFound("Draft not found.");
  return draft;
}

export async function loadEditableDraft(actor: DraftPeopleActor, draftId: string) {
  const draft = await loadOpenDraft(actor, draftId);
  if (draft.startedTournamentId)
    throw conflict("This draft has already been started.", { code: "DRAFT_ALREADY_STARTED" });
  return draft;
}

/** Does this email already have access (owner, account manager or editor)? */
export async function existingAccessFor(organizerId: string, draftId: string, email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return null;
  if (user.id === organizerId) return "owner";
  const manager = await prisma.organizerMembership.count({
    where: { organizerId, memberUserId: user.id, revokedAt: null }
  });
  if (manager > 0) return "manager";
  const editor = await prisma.draftCollaborator.count({ where: { draftId, userId: user.id, revokedAt: null } });
  return editor > 0 ? "editor" : null;
}
