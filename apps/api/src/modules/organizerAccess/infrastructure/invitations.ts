import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../../lib/prisma.js";
import { getMailer } from "../../../lib/mail/index.js";
import { AppError, conflict, forbidden, notFound } from "../../../shared/kernel/appError.js";
import { requirePersistedVerifiedUser } from "./access.js";
import { sharedOrganizerAccessEnabled } from "../domain/policy.js";

const lifetime = 7 * 24 * 60 * 60 * 1000;
export const invitationHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function requireSharingEnabled() {
  if (!sharedOrganizerAccessEnabled()) throw notFound("Shared organizer access is not enabled.");
}
const invalidInvite = () =>
  new AppError(
    "VALIDATION",
    410,
    "This invitation is invalid, expired or revoked. Ask the owner for a new invitation."
  );

export async function writeAccessActivity(
  organizerId: string,
  actor: { id: string; name: string },
  action: string,
  targetId: string
) {
  await prisma.organizerActivity.create({
    data: { organizerId, actorUserId: actor.id, actorName: actor.name, action, targetId }
  });
}

export async function sendInvitation(ownerId: string, email: string, invitationId?: string) {
  requireSharingEnabled();
  const owner = await requirePersistedVerifiedUser(ownerId);
  if (email === owner.email.trim().toLowerCase()) throw conflict("You already own this organizer account.");
  const base = process.env.ORGANIZER_WEB_BASE_URL?.trim();
  if (!base || !/^https?:\/\//.test(base))
    throw new AppError(
      "INTERNAL",
      503,
      "Organizer invitation links are not configured. Set ORGANIZER_WEB_BASE_URL."
    );
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = invitationHash(rawToken);
  const invitation = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${ownerId} FOR UPDATE`;
    const existingUser = await tx.user.findUnique({ where: { email } });
    if (
      existingUser &&
      (await tx.organizerMembership.count({
        where: { organizerId: ownerId, memberUserId: existingUser.id, revokedAt: null }
      }))
    )
      throw conflict("This person is already a manager.");
    const recent = await tx.organizerActivity.count({
      where: {
        organizerId: ownerId,
        action: { in: ["INVITATION_CREATED", "INVITATION_RESENT"] },
        occurredAt: { gte: new Date(Date.now() - 3600000) }
      }
    });
    if (recent >= 20) throw new AppError("VALIDATION", 429, "Too many invitations. Try again in an hour.");
    let row;
    if (invitationId) {
      const prior = await tx.organizerInvitation.findFirst({
        where: { id: invitationId, organizerId: ownerId, acceptedAt: null, revokedAt: null }
      });
      if (!prior) throw notFound("Pending invitation not found.");
      if (prior.invitedEmailNormalized !== email) throw conflict("Invitation email does not match.");
      row = await tx.organizerInvitation.update({
        where: { id: invitationId },
        data: {
          tokenHash,
          expiresAt: new Date(Date.now() + lifetime),
          deliveryStatus: "PENDING",
          sendAttempts: { increment: 1 }
        }
      });
    } else {
      await tx.organizerInvitation.updateMany({
        where: { organizerId: ownerId, invitedEmailNormalized: email, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      if (
        (await tx.organizerInvitation.count({
          where: { organizerId: ownerId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }
        })) >= 25
      )
        throw conflict("There are already 25 pending invitations. Revoke an unused invitation first.");
      row = await tx.organizerInvitation.create({
        data: {
          organizerId: ownerId,
          invitedEmailNormalized: email,
          invitedByUserId: ownerId,
          tokenHash,
          expiresAt: new Date(Date.now() + lifetime),
          sendAttempts: 1
        }
      });
    }
    await tx.organizerActivity.create({
      data: {
        organizerId: ownerId,
        actorUserId: owner.id,
        actorName: owner.name,
        action: invitationId ? "INVITATION_RESENT" : "INVITATION_CREATED",
        targetId: row.id
      }
    });
    return row;
  });
  const url = new URL("/invite/accept", base);
  url.hash = new URLSearchParams({ token: rawToken }).toString();
  let deliveryStatus = "SENT";
  try {
    await getMailer().send({
      to: email,
      subject: `${owner.name} invited you to manage padel tournaments`,
      text: `${owner.name} invited you as a Manager of their organizer account. You can create and manage all their tournaments, player careers and exports. Sign in with ${email}, verify your email, and accept explicitly. This invitation expires in seven days.\n\n${url.toString()}`,
      sensitive: true
    });
  } catch {
    deliveryStatus = "FAILED";
  }
  await prisma.organizerInvitation.updateMany({
    where: { id: invitation.id, tokenHash },
    data: { deliveryStatus, lastSentAt: new Date() }
  });
  return { id: invitation.id, email, expiresAt: invitation.expiresAt, deliveryStatus };
}

export async function previewInvitation(token: string) {
  requireSharingEnabled();
  const row = await prisma.organizerInvitation.findUnique({
    where: { tokenHash: invitationHash(token) },
    include: { owner: { select: { name: true } } }
  });
  if (!row || row.revokedAt || row.expiresAt < new Date()) throw invalidInvite();
  return {
    organizerName: row.owner.name,
    invitedEmail: row.invitedEmailNormalized.replace(/^(.).+(@.+)$/, "$1***$2"),
    role: "MANAGER",
    expiresAt: row.expiresAt,
    accepted: Boolean(row.acceptedAt)
  };
}

export async function acceptInvitation(actorId: string, token: string) {
  requireSharingEnabled();
  const actor = await requirePersistedVerifiedUser(actorId);
  const tokenHash = invitationHash(token);
  const initial = await prisma.organizerInvitation.findUnique({ where: { tokenHash } });
  if (!initial) throw invalidInvite();
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${initial.organizerId} FOR UPDATE`;
    const invite = await tx.organizerInvitation.findUnique({ where: { tokenHash } });
    if (!invite || invite.revokedAt || invite.expiresAt < new Date()) throw invalidInvite();
    await requirePersistedVerifiedUser(invite.organizerId);
    if (actor.email.trim().toLowerCase() !== invite.invitedEmailNormalized)
      throw forbidden("Sign in with the verified email address this invitation was sent to.");
    if (actor.id === invite.organizerId) throw conflict("You already own this organizer account.");
    if (invite.acceptedAt) {
      const active = await tx.organizerMembership.findFirst({
        where: { organizerId: invite.organizerId, memberUserId: actorId, revokedAt: null }
      });
      if (!active || invite.acceptedByUserId !== actorId) throw invalidInvite();
      return { organizerId: invite.organizerId, role: "MANAGER" as const };
    }
    await tx.organizerMembership.upsert({
      where: { organizerId_memberUserId: { organizerId: invite.organizerId, memberUserId: actorId } },
      create: { organizerId: invite.organizerId, memberUserId: actorId },
      update: { revokedAt: null, revokedByUserId: null, acceptedAt: new Date() }
    });
    await tx.organizerInvitation.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedByUserId: actorId }
    });
    await tx.organizerActivity.create({
      data: {
        organizerId: invite.organizerId,
        actorUserId: actor.id,
        actorName: actor.name,
        action: "INVITATION_ACCEPTED",
        targetId: invite.id
      }
    });
    return { organizerId: invite.organizerId, role: "MANAGER" as const };
  });
}
