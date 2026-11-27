import type { FastifyRequest } from "fastify";
import type { OrganizerRole } from "@padel/shared";
import { prisma } from "../../../lib/prisma.js";
import { AppError, forbidden, notFound } from "../../../shared/kernel/appError.js";
import {
  organizerCapabilities,
  sharedOrganizerAccessEnabled,
  type OrganizerOperation
} from "../domain/policy.js";

export interface OrganizerContext {
  actorUserId: string;
  organizerId: string;
  ownerName: string;
  role: OrganizerRole;
}
declare module "fastify" {
  interface FastifyRequest {
    organizerContext?: OrganizerContext;
  }
}

export async function resolveAccess(
  actorUserId: string,
  organizerId: string,
  operation: OrganizerOperation = "manage"
): Promise<OrganizerContext> {
  if (actorUserId === organizerId) {
    const owner = await prisma.user.findUnique({ where: { id: organizerId }, select: { name: true } });
    return { actorUserId, organizerId, ownerName: owner?.name ?? "Organizer", role: "OWNER" };
  }
  if (!sharedOrganizerAccessEnabled()) throw notFound("Organizer account not found.");
  const member = await prisma.organizerMembership.findUnique({
    where: { organizerId_memberUserId: { organizerId, memberUserId: actorUserId } },
    include: { owner: true, member: true }
  });
  if (member?.revokedAt)
    throw new AppError("FORBIDDEN", 403, "Your access to this organizer account has been removed.", {
      code: "ORGANIZER_ACCESS_REVOKED"
    });
  if (!member) throw notFound("Organizer account not found.");
  if (
    member.member.isGuest ||
    !member.member.emailVerifiedAt ||
    member.owner.isGuest ||
    !member.owner.emailVerifiedAt
  ) {
    throw new AppError("FORBIDDEN", 403, "Verify your email to use shared organizer access.", {
      code: "EMAIL_VERIFY_REQUIRED"
    });
  }
  if (!organizerCapabilities("MANAGER")[operation])
    throw forbidden("Only the owner can perform this action.");
  return { actorUserId, organizerId, ownerName: member.owner.name, role: "MANAGER" };
}

export async function requirePersistedVerifiedUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isGuest) throw forbidden("Sign in with a verified account to manage organizer access.");
  if (!user.emailVerifiedAt)
    throw new AppError("FORBIDDEN", 403, "Verify your email to manage organizer access.", {
      code: "EMAIL_VERIFY_REQUIRED"
    });
  return user;
}

export function organizerId(request: FastifyRequest): string {
  if (!request.user) throw forbidden("Authentication required.");
  return request.organizerContext?.organizerId ?? request.user.id;
}

export async function resolveOrganizerRequest(request: FastifyRequest): Promise<void> {
  if (!request.user) return;
  const url = request.routeOptions.url ?? "";
  if (
    !/^\/(tournaments|koh\/tournaments|drafts(\/|$)|players\/suggestions|me\/(players|career-share)|organizers\/[^/]+\/(players|career-share|result-imports))/.test(
      url
    )
  )
    return;
  const params = request.params as { id?: string; organizerId?: string };
  const body = request.body as { tournamentId?: unknown } | undefined;
  const header = request.headers["x-organizer-id"];
  if (header !== undefined && (typeof header !== "string" || !header || header.length > 128))
    throw new AppError("VALIDATION", 400, "Invalid organizer context.");
  const isPersonal = url.startsWith("/me/");
  let selected = isPersonal ? request.user.id : (params.organizerId ?? header ?? request.user.id);
  const isTournament = url.startsWith("/tournaments") || url.startsWith("/koh/tournaments");
  const isDraft = url.startsWith("/drafts");
  const tournamentId = isTournament
    ? (params.id ?? (typeof body?.tournamentId === "string" ? body.tournamentId : undefined))
    : undefined;
  const resourceOwner = tournamentId
    ? await tournamentOwner(tournamentId)
    : isDraft && params.id
      ? await draftOwner(params.id)
      : undefined;
  if (resourceOwner) {
    await resolveAccess(request.user.id, resourceOwner.organizerId);
    if (header && header !== resourceOwner.organizerId)
      throw new AppError("CONFLICT", 409, `Selected organizer does not own this ${resourceOwner.label}.`, {
        code: "ORGANIZER_CONTEXT_MISMATCH"
      });
    selected = resourceOwner.organizerId;
  } else if (!isPersonal && params.organizerId && header && params.organizerId !== header) {
    throw new AppError("CONFLICT", 409, "Organizer context does not match the requested account.", {
      code: "ORGANIZER_CONTEXT_MISMATCH"
    });
  }
  const operation: OrganizerOperation =
    request.method !== "DELETE" ? "manage" : isDraft ? "deleteDraft" : isTournament ? "deleteTournament" : "manage";
  request.organizerContext = await resolveAccess(request.user.id, selected, operation);
}

async function tournamentOwner(id: string) {
  const row = await prisma.tournament.findUnique({ where: { id }, select: { organizerId: true } });
  if (!row?.organizerId) throw notFound("Tournament not found.");
  return { organizerId: row.organizerId, label: "tournament" };
}

/** Deleted drafts are invisible; started drafts stay readable (their routes reject edits). */
async function draftOwner(id: string) {
  const row = await prisma.tournamentDraft.findFirst({
    where: { id, deletedAt: null },
    select: { organizerId: true }
  });
  if (!row) throw notFound("Draft not found.");
  return { organizerId: row.organizerId, label: "draft" };
}
