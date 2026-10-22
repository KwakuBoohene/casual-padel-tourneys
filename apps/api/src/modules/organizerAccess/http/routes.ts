import { pruneExpiredOrganizerActivity } from "../infrastructure/pruneActivity.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { inviteOrganizerManagerSchema, organizerInvitationTokenSchema } from "@padel/shared";
import { prisma } from "../../../lib/prisma.js";
import { requireAuth, requireOrganizerAccess } from "../../../lib/auth.js";
import { forbidden, notFound, validation, conflict } from "../../../shared/kernel/appError.js";
import { organizerCapabilities, sharedOrganizerAccessEnabled } from "../domain/policy.js";
import { requirePersistedVerifiedUser, resolveAccess } from "../infrastructure/access.js";
import { acceptInvitation, previewInvitation, sendInvitation } from "../infrastructure/invitations.js";

async function access(request: FastifyRequest, ownerOnly = false) {
  const organizerId = (request.params as { organizerId: string }).organizerId;
  const header = request.headers["x-organizer-id"];
  if (header && header !== organizerId) throw conflict("Selected organizer does not match this account.");
  const context = await resolveAccess(request.user!.id, organizerId, ownerOnly ? "manageMembers" : "manage");
  if (ownerOnly) await requirePersistedVerifiedUser(request.user!.id);
  return context;
}

export function registerOrganizerAccessRoutes(server: FastifyInstance) {
  server.get("/organizers", { preHandler: requireOrganizerAccess }, async (request) => {
    const self = {
      id: request.user!.id,
      name: request.user!.name ?? "My organizer account",
      role: "OWNER" as const,
      capabilities: organizerCapabilities("OWNER")
    };
    if (!sharedOrganizerAccessEnabled() || request.user!.isGuest)
      return { data: [self], sharedAccessEnabled: sharedOrganizerAccessEnabled() };
    const actor = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!actor?.emailVerifiedAt) return { data: [self], sharedAccessEnabled: sharedOrganizerAccessEnabled() };
    const rows = await prisma.organizerMembership.findMany({
      where: {
        memberUserId: actor.id,
        revokedAt: null,
        owner: { isGuest: false, emailVerifiedAt: { not: null } }
      },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { acceptedAt: "asc" }
    });
    return {
      data: [
        self,
        ...rows.map((row) => ({
          ...row.owner,
          role: "MANAGER" as const,
          capabilities: organizerCapabilities("MANAGER")
        }))
      ],
      sharedAccessEnabled: true
    };
  });
  server.get("/organizers/:organizerId/members", { preHandler: requireOrganizerAccess }, async (request) => {
    const context = await access(request);
    const owner = await prisma.user.findUniqueOrThrow({
      where: { id: context.organizerId },
      select: { id: true, name: true }
    });
    const members = await prisma.organizerMembership.findMany({
      where: {
        organizerId: context.organizerId,
        revokedAt: null,
        ...(context.role === "MANAGER" ? { memberUserId: request.user!.id } : {})
      },
      include: { member: { select: { id: true, name: true, email: true } } },
      take: 100
    });
    const invitations =
      context.role === "OWNER"
        ? await prisma.organizerInvitation.findMany({
            where: {
              organizerId: context.organizerId,
              revokedAt: null,
              acceptedAt: null,
              expiresAt: { gt: new Date() }
            },
            take: 25,
            orderBy: { createdAt: "desc" },
            select: { id: true, invitedEmailNormalized: true, expiresAt: true, deliveryStatus: true }
          })
        : [];
    return {
      data: {
        owner,
        members: members.map((row) => ({ ...row.member, acceptedAt: row.acceptedAt })),
        invitations: invitations.map((row) => ({
          id: row.id,
          email: row.invitedEmailNormalized,
          expiresAt: row.expiresAt,
          deliveryStatus: row.deliveryStatus
        }))
      }
    };
  });
  server.post(
    "/organizers/:organizerId/invitations",
    { preHandler: requireOrganizerAccess },
    async (request) => {
      const context = await access(request, true);
      const input = inviteOrganizerManagerSchema.safeParse(request.body);
      if (!input.success) throw validation("Enter a valid email address and Manager role.");
      return { data: await sendInvitation(context.organizerId, input.data.email) };
    }
  );
  server.post(
    "/organizers/:organizerId/invitations/:id/resend",
    { preHandler: requireOrganizerAccess },
    async (request) => {
      const context = await access(request, true);
      const id = (request.params as { id: string }).id;
      const row = await prisma.organizerInvitation.findFirst({
        where: { id, organizerId: context.organizerId }
      });
      if (!row) throw notFound("Invitation not found.");
      return { data: await sendInvitation(context.organizerId, row.invitedEmailNormalized, id) };
    }
  );
  server.delete(
    "/organizers/:organizerId/invitations/:id",
    { preHandler: requireOrganizerAccess },
    async (request) => {
      const context = await access(request, true);
      const id = (request.params as { id: string }).id;
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${context.organizerId} FOR UPDATE`;
        const row = await tx.organizerInvitation.findFirst({
          where: { id, organizerId: context.organizerId }
        });
        if (!row) throw notFound("Invitation not found.");
        if (row.acceptedAt) throw conflict("Invitation already accepted. Remove the manager instead.");
        await tx.organizerInvitation.update({ where: { id }, data: { revokedAt: new Date() } });
        await tx.organizerActivity.create({
          data: {
            organizerId: context.organizerId,
            actorUserId: request.user!.id,
            actorName: request.user!.name ?? "Owner",
            action: "INVITATION_REVOKED",
            targetId: id
          }
        });
      });
      return { data: { revoked: true } };
    }
  );
  server.post(
    "/organizer-invitations/preview",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request) => {
      const parsed = organizerInvitationTokenSchema.safeParse(request.body);
      if (!parsed.success) throw validation("Invalid invitation.");
      return { data: await previewInvitation(parsed.data.token) };
    }
  );
  server.post(
    "/organizer-invitations/accept",
    { preHandler: requireAuth, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request) => {
      const parsed = organizerInvitationTokenSchema.safeParse(request.body);
      if (!parsed.success) throw validation("Invalid invitation.");
      return { data: await acceptInvitation(request.user!.id, parsed.data.token) };
    }
  );
  server.delete(
    "/organizers/:organizerId/members/:memberUserId",
    { preHandler: requireAuth },
    async (request) => {
      const { organizerId, memberUserId } = request.params as { organizerId: string; memberUserId: string };
      const selected = request.headers["x-organizer-id"];
      if (selected && selected !== organizerId)
        throw conflict("Selected organizer does not match this account.");
      const actor = await requirePersistedVerifiedUser(request.user!.id);
      if (memberUserId === organizerId) throw forbidden("The owner cannot be removed.");
      if (actor.id !== organizerId && actor.id !== memberUserId)
        throw forbidden("Only the owner can remove another manager.");
      if (actor.id !== organizerId) await resolveAccess(actor.id, organizerId);
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${organizerId} FOR UPDATE`;
        const row = await tx.organizerMembership.findUnique({
          where: { organizerId_memberUserId: { organizerId, memberUserId } }
        });
        if (!row) throw notFound("Manager not found.");
        if (!row.revokedAt) {
          await tx.organizerMembership.update({
            where: { id: row.id },
            data: { revokedAt: new Date(), revokedByUserId: actor.id }
          });
          await tx.organizerActivity.create({
            data: {
              organizerId,
              actorUserId: actor.id,
              actorName: actor.name,
              action: actor.id === memberUserId ? "MANAGER_LEFT" : "MANAGER_REMOVED",
              targetId: memberUserId
            }
          });
        }
      });
      return { data: { revoked: true } };
    }
  );
  server.get("/organizers/:organizerId/activity", { preHandler: requireOrganizerAccess }, async (request) => {
    const context = await access(request);
    await pruneExpiredOrganizerActivity(context.organizerId);
    const query = request.query as { cursor?: string; limit?: string };
    const limit = query.limit === undefined ? 25 : Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw validation("limit must be between 1 and 100.");
    if (
      query.cursor &&
      !(await prisma.organizerActivity.findFirst({
        where: { id: query.cursor, organizerId: context.organizerId }
      }))
    )
      throw validation("Invalid activity cursor.");
    const rows = await prisma.organizerActivity.findMany({
      where: { organizerId: context.organizerId },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: { id: true, actorName: true, action: true, targetId: true, occurredAt: true, metadata: true }
    });
    return { data: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
  });
}
