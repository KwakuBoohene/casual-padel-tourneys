import { type DraftInvitationPreview } from "@padel/shared";

import { prisma } from "../../../lib/prisma.js";
import { AppError, conflict, forbidden, notFound } from "../../../shared/kernel/appError.js";
import { sharedOrganizerAccessEnabled } from "../../organizerAccess/domain/policy.js";
import { requirePersistedVerifiedUser } from "../../organizerAccess/infrastructure/access.js";
import { createObservedActivity } from "../../usage/infrastructure/observedActivity.js";
import { draftPlayerCount, parseStoredPayload } from "../domain/draftView.js";
import { draftInvitationHash } from "./draftInvitations.js";

const invalidInvite = () =>
  new AppError("VALIDATION", 410, "This invitation is invalid, expired or revoked. Ask for a new invitation.", {
    code: "DRAFT_INVITATION_INVALID"
  });

function requireSharing() {
  if (!sharedOrganizerAccessEnabled()) throw notFound("Shared organizer access is not enabled.");
}

async function findUsable(token: string) {
  const row = await prisma.draftInvitation.findUnique({
    where: { tokenHash: draftInvitationHash(token) },
    include: {
      draft: {
        select: {
          id: true,
          name: true,
          mode: true,
          payload: true,
          organizerId: true,
          deletedAt: true,
          startedTournamentId: true,
          organizer: { select: { name: true } }
        }
      }
    }
  });
  if (!row || row.revokedAt || row.expiresAt < new Date()) throw invalidInvite();
  if (row.draft.deletedAt || row.draft.startedTournamentId) throw invalidInvite();
  return row;
}

const maskEmail = (email: string) => email.replace(/^(.).+(@.+)$/, "$1***$2");

export async function previewDraftInvitation(token: string): Promise<DraftInvitationPreview> {
  requireSharing();
  const row = await findUsable(token);
  const inviter = await prisma.user.findUnique({ where: { id: row.invitedById }, select: { name: true } });
  return {
    draftName: row.draft.name,
    mode: row.draft.mode,
    ownerName: row.draft.organizer.name,
    invitedByName: inviter?.name ?? row.draft.organizer.name,
    invitedEmail: maskEmail(row.invitedEmailNormalized),
    playerCount: draftPlayerCount(parseStoredPayload(row.draft)),
    expiresAt: row.expiresAt.toISOString(),
    status: row.acceptedAt ? "ACCEPTED" : row.declinedAt ? "DECLINED" : "PENDING"
  };
}

async function requireInvitee(actorId: string, invitedEmail: string) {
  const actor = await requirePersistedVerifiedUser(actorId);
  if (actor.email.trim().toLowerCase() !== invitedEmail)
    throw forbidden(`Sign in with ${maskEmail(invitedEmail)} to use this invitation.`, {
      code: "DRAFT_INVITATION_EMAIL_MISMATCH"
    });
  return actor;
}

/** Accept → active per-draft editor. Idempotent for the same user. */
export async function acceptDraftInvitation(actorId: string, token: string) {
  requireSharing();
  const initial = await findUsable(token);
  const actor = await requireInvitee(actorId, initial.invitedEmailNormalized);
  if (actor.id === initial.draft.organizerId) throw conflict("You already own this draft.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${initial.draft.organizerId} FOR UPDATE`;
    const invite = await tx.draftInvitation.findUnique({ where: { id: initial.id } });
    if (!invite || invite.revokedAt || invite.declinedAt || invite.expiresAt < new Date()) throw invalidInvite();
    const result = { draftId: initial.draft.id, organizerId: initial.draft.organizerId };
    if (invite.acceptedAt) {
      if (invite.acceptedByUserId !== actor.id) throw invalidInvite();
      return result;
    }
    await tx.draftCollaborator.upsert({
      where: { draftId_userId: { draftId: invite.draftId, userId: actor.id } },
      create: { draftId: invite.draftId, userId: actor.id, invitedById: invite.invitedById },
      update: { revokedAt: null, revokedById: null }
    });
    await tx.draftInvitation.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedByUserId: actor.id }
    });
    await createObservedActivity(tx, {
      data: {
        organizerId: initial.draft.organizerId,
        actorUserId: actor.id,
        actorName: actor.name,
        action: "DRAFT_INVITATION_ACCEPTED",
        targetId: invite.draftId
      }
    });
    return result;
  });
}

export async function declineDraftInvitation(actorId: string, token: string) {
  requireSharing();
  const invite = await findUsable(token);
  await requireInvitee(actorId, invite.invitedEmailNormalized);
  if (invite.acceptedAt) throw conflict("This invitation was already accepted.");
  await prisma.draftInvitation.updateMany({
    where: { id: invite.id, acceptedAt: null, declinedAt: null },
    data: { declinedAt: new Date() }
  });
  return { declined: true };
}
