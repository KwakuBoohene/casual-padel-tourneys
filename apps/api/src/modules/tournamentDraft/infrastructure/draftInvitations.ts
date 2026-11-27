import { createHash, randomBytes } from "node:crypto";
import {
  DRAFT_INVITATION_LIFETIME_DAYS,
  DRAFT_INVITATIONS_PER_HOUR,
  DRAFT_PENDING_INVITATIONS_MAX,
  type DraftPendingInvitation
} from "@padel/shared";

import { deferUntilCommit } from "../../../lib/databaseContext.js";
import { getMailer } from "../../../lib/mail/index.js";
import { renderEmail } from "../../../lib/mail/layout.js";
import { databaseClient, prisma } from "../../../lib/prisma.js";
import { AppError, conflict, notFound } from "../../../shared/kernel/appError.js";
import {
  existingAccessFor,
  loadEditableDraft,
  pendingInvitationWhere,
  type DraftPeopleActor
} from "./draftAccessRows.js";

const LIFETIME_MS = DRAFT_INVITATION_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
export const draftInvitationHash = (token: string) => createHash("sha256").update(token).digest("hex");

const ACCESS_MESSAGES = {
  owner: "That's the owner of this draft.",
  manager: "This person already manages this organizer account.",
  editor: "This person is already a co-organizer of this draft."
} as const;

function invitationBaseUrl(): string {
  const base = process.env.ORGANIZER_WEB_BASE_URL?.trim();
  if (!base || !/^https?:\/\//.test(base))
    throw new AppError("INTERNAL", 503, "Invitation links are not configured. Set ORGANIZER_WEB_BASE_URL.");
  return base;
}

export function toPendingInvitation(row: {
  id: string;
  invitedEmailNormalized: string;
  createdAt: Date;
  expiresAt: Date;
  deliveryStatus: string;
}): DraftPendingInvitation {
  return {
    id: row.id,
    email: row.invitedEmailNormalized,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    deliveryStatus: row.deliveryStatus
  };
}

/**
 * Invite (or re-invite) an email to edit one draft. A resend is a fresh invite: the previous
 * token for that email is revoked. The email goes out only after the request commits.
 */
export async function sendDraftInvitation(
  actor: DraftPeopleActor,
  draftId: string,
  email: string
): Promise<DraftPendingInvitation> {
  const base = invitationBaseUrl();
  const draft = await loadEditableDraft(actor, draftId);
  const access = await existingAccessFor(draft.organizerId, draft.id, email);
  if (access) throw conflict(ACCESS_MESSAGES[access], { code: "ALREADY_HAS_ACCESS" });

  const now = new Date();
  const lastHour = await prisma.draftInvitation.count({
    where: { draftId, createdAt: { gte: new Date(now.getTime() - 3600000) } }
  });
  if (lastHour >= DRAFT_INVITATIONS_PER_HOUR)
    throw new AppError("VALIDATION", 429, "Too many invitations for this draft. Try again in an hour.");
  await prisma.draftInvitation.updateMany({
    where: { draftId, invitedEmailNormalized: email, ...pendingInvitationWhere(now) },
    data: { revokedAt: now }
  });
  const pending = await prisma.draftInvitation.count({ where: { draftId, ...pendingInvitationWhere(now) } });
  if (pending >= DRAFT_PENDING_INVITATIONS_MAX)
    throw conflict(`There are already ${pending} pending invitations. Revoke one first.`);

  const rawToken = randomBytes(32).toString("base64url");
  const row = await prisma.draftInvitation.create({
    data: {
      draftId,
      invitedEmailNormalized: email,
      invitedById: actor.actorUserId,
      tokenHash: draftInvitationHash(rawToken),
      expiresAt: new Date(now.getTime() + LIFETIME_MS),
      sendAttempts: 1
    }
  });
  const link = new URL("/invite/draft", base);
  link.hash = new URLSearchParams({ token: rawToken }).toString();
  const deliver = () => deliverInvitation(row.id, email, link.toString(), actor.actorName, draft.name);
  if (!deferUntilCommit(deliver)) await deliver();
  return toPendingInvitation(row);
}

async function deliverInvitation(id: string, email: string, url: string, inviter: string, draftName: string) {
  const title = draftName.trim() || "a padel tournament";
  let deliveryStatus = "SENT";
  try {
    await getMailer().send({
      to: email,
      subject: `${inviter} invited you to co-organize ${title}`,
      ...renderEmail({
        preheader: `${inviter} wants your help setting up ${title}.`,
        heading: "You're invited to co-organize",
        paragraphs: [
          `${inviter} invited you to help set up ${title} on Casual Padel. You'll be able to edit the setup and players, invite others and start the tournament.`,
          `To accept, sign in with ${email}, verify your email, then open the invitation.`
        ],
        cta: { label: "View invitation", url },
        note: `This invitation expires in ${DRAFT_INVITATION_LIFETIME_DAYS} days.`,
        footer: "If you weren't expecting this invitation, you can ignore this email. Nothing will change."
      }),
      sensitive: true
    });
  } catch {
    deliveryStatus = "FAILED";
  }
  await databaseClient.draftInvitation.update({ where: { id }, data: { deliveryStatus, lastSentAt: new Date() } });
}

/** Resend = fresh invite to the same email (old link stops working). */
export async function resendDraftInvitation(actor: DraftPeopleActor, draftId: string, invitationId: string) {
  const prior = await prisma.draftInvitation.findFirst({
    where: { id: invitationId, draftId, ...pendingInvitationWhere() },
    select: { invitedEmailNormalized: true }
  });
  if (!prior) throw notFound("Pending invitation not found.");
  return sendDraftInvitation(actor, draftId, prior.invitedEmailNormalized);
}

export async function revokeDraftInvitation(actor: DraftPeopleActor, draftId: string, invitationId: string) {
  await loadEditableDraft(actor, draftId);
  const result = await prisma.draftInvitation.updateMany({
    where: { id: invitationId, draftId, acceptedAt: null, declinedAt: null, revokedAt: null },
    data: { revokedAt: new Date() }
  });
  if (result.count === 0) throw notFound("Pending invitation not found.");
}
