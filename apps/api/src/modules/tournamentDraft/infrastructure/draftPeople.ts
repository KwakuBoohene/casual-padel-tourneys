import type { DraftPeople } from "@padel/shared";

import { prisma } from "../../../lib/prisma.js";
import { forbidden, notFound } from "../../../shared/kernel/appError.js";
import { loadEditableDraft, loadOpenDraft, pendingInvitationWhere, type DraftPeopleActor } from "./draftAccessRows.js";
import { toPendingInvitation } from "./draftInvitations.js";

/** Who can open this draft. Pending invitations are listed for every role that can manage people. */
export async function getDraftPeople(actor: DraftPeopleActor, draftId: string): Promise<DraftPeople> {
  const draft = await loadOpenDraft(actor, draftId);
  const [editors, invitations] = await Promise.all([
    prisma.draftCollaborator.findMany({
      where: { draftId, revokedAt: null },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, user: { select: { id: true, name: true, email: true } } }
    }),
    prisma.draftInvitation.findMany({
      where: { draftId, ...pendingInvitationWhere() },
      orderBy: { createdAt: "asc" }
    })
  ]);
  const isAccountRole = actor.role !== "EDITOR";
  const open = !draft.startedTournamentId;
  return {
    owner: {
      userId: draft.organizer.id,
      name: draft.organizer.name,
      email: draft.organizer.email,
      role: "OWNER"
    },
    editors: editors.map((entry) => ({
      userId: entry.user.id,
      name: entry.user.name,
      email: entry.user.email,
      role: "EDITOR",
      addedAt: entry.createdAt.toISOString()
    })),
    invitations: invitations.map(toPendingInvitation),
    keepAccessAfterStart: draft.keepAccessAfterStart,
    viewerRole: actor.role,
    can: {
      managePeople: open,
      deleteDraft: open && isAccountRole,
      changeSettings: open && isAccountRole
    }
  };
}

/**
 * Owner, managers and editors may remove an editor (editors may also remove themselves).
 * Once the draft has started this also ends the person's kept access to the live tournament;
 * at that point only the owner side (or the person themselves) may do it.
 */
export async function removeDraftEditor(actor: DraftPeopleActor, draftId: string, userId: string) {
  const draft = await loadOpenDraft(actor, draftId);
  const tournamentId = draft.startedTournamentId;
  if (tournamentId && actor.role === "EDITOR" && actor.actorUserId !== userId)
    throw forbidden("Only the owner can remove a co-organizer from a started tournament.");
  const now = new Date();
  const [draftAccess, tournamentAccess] = await prisma.$transaction([
    prisma.draftCollaborator.updateMany({
      where: { draftId, userId, revokedAt: null },
      data: { revokedAt: now, revokedById: actor.actorUserId }
    }),
    prisma.tournamentCollaborator.updateMany({
      where: { tournamentId: tournamentId ?? "", sourceDraftId: draftId, userId, revokedAt: null },
      data: { revokedAt: now }
    })
  ]);
  if (draftAccess.count + tournamentAccess.count === 0) throw notFound("Co-organizer not found.");
}

export async function updateDraftSettings(
  actor: DraftPeopleActor,
  draftId: string,
  input: { keepAccessAfterStart: boolean }
) {
  if (actor.role === "EDITOR") throw forbidden("Only the owner can change this setting.");
  await loadEditableDraft(actor, draftId);
  await prisma.tournamentDraft.update({
    where: { id: draftId },
    data: { keepAccessAfterStart: input.keepAccessAfterStart }
  });
  return getDraftPeople(actor, draftId);
}
