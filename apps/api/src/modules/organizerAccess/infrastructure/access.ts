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
    !/^\/(tournaments|koh\/tournaments|players\/suggestions|me\/(players|career-share)|organizers\/[^/]+\/(players|career-share))/.test(
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
  const tournamentId = isTournament
    ? (params.id ?? (typeof body?.tournamentId === "string" ? body.tournamentId : undefined))
    : undefined;
  if (tournamentId) {
    const row = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { organizerId: true }
    });
    if (!row?.organizerId) throw notFound("Tournament not found.");
    await resolveAccess(request.user.id, row.organizerId);
    if (header && header !== row.organizerId)
      throw new AppError("CONFLICT", 409, "Selected organizer does not own this tournament.", {
        code: "ORGANIZER_CONTEXT_MISMATCH"
      });
    selected = row.organizerId;
  } else if (!isPersonal && params.organizerId && header && params.organizerId !== header) {
    throw new AppError("CONFLICT", 409, "Organizer context does not match the requested account.", {
      code: "ORGANIZER_CONTEXT_MISMATCH"
    });
  }
  request.organizerContext = await resolveAccess(
    request.user.id,
    selected,
    isTournament && request.method === "DELETE" ? "deleteTournament" : "manage"
  );
}
