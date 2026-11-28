import { prisma } from "../../../lib/prisma.js";
import { forbidden } from "../../../shared/kernel/appError.js";
import { sharedOrganizerAccessEnabled } from "../domain/policy.js";
import type { OrganizerContext } from "./access.js";

/**
 * Per-draft editor access. Only ever resolved for `/drafts/:id…` routes, so an editor
 * context can never reach other drafts, tournaments or account data.
 */
export async function resolveDraftEditor(input: {
  actorUserId: string;
  draftId: string;
  organizerId: string;
  url: string;
  method: string;
}): Promise<OrganizerContext | null> {
  if (!sharedOrganizerAccessEnabled() || input.actorUserId === input.organizerId) return null;
  const row = await prisma.draftCollaborator.findUnique({
    where: { draftId_userId: { draftId: input.draftId, userId: input.actorUserId } },
    select: {
      revokedAt: true,
      user: { select: { isGuest: true, emailVerifiedAt: true } },
      draft: { select: { organizer: { select: { name: true } } } }
    }
  });
  if (!row || row.revokedAt || row.user.isGuest || !row.user.emailVerifiedAt) return null;
  if (input.method === "DELETE" && input.url === "/drafts/:id")
    throw forbidden("Only the owner can delete this draft.");
  return {
    actorUserId: input.actorUserId,
    organizerId: input.organizerId,
    ownerName: row.draft.organizer.name,
    role: "EDITOR"
  };
}

/**
 * Live-control access for a draft editor who kept access after start. Only resolved for
 * routes that name this tournament (path id or body `tournamentId`); never delete.
 */
export async function resolveTournamentEditor(input: {
  actorUserId: string;
  tournamentId: string;
  organizerId: string;
  method: string;
}): Promise<OrganizerContext | null> {
  if (!sharedOrganizerAccessEnabled() || input.actorUserId === input.organizerId) return null;
  const row = await prisma.tournamentCollaborator.findUnique({
    where: { tournamentId_userId: { tournamentId: input.tournamentId, userId: input.actorUserId } },
    select: {
      revokedAt: true,
      user: { select: { isGuest: true, emailVerifiedAt: true } },
      tournament: { select: { organizer: { select: { name: true } } } }
    }
  });
  if (!row || row.revokedAt || row.user.isGuest || !row.user.emailVerifiedAt) return null;
  if (input.method === "DELETE") throw forbidden("Only the owner can delete this tournament.");
  return {
    actorUserId: input.actorUserId,
    organizerId: input.organizerId,
    ownerName: row.tournament.organizer?.name ?? "Organizer",
    role: "EDITOR"
  };
}
