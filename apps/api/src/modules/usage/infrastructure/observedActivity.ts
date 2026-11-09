import type { OrganizerActivity, Prisma } from "@prisma/client";
import { recordUsageEvent } from "./recordEvent.js";

export async function createObservedActivity(
  tx: Prisma.TransactionClient,
  input: { data: Prisma.OrganizerActivityUncheckedCreateInput }
): Promise<OrganizerActivity> {
  const activity = await tx.organizerActivity.create(input);
  await recordUsageEvent(tx, {
    id: `activity:${activity.id}`,
    kind: ["POST /tournaments", "POST /koh/tournaments"].includes(activity.action)
      ? "tournament.created"
      : "business.action",
    surface: "organizer",
    actorUserId: activity.actorUserId,
    ownerId: activity.organizerId,
    targetId: activity.targetId,
    action: activity.action,
    occurredAt: activity.occurredAt
  });
  return activity;
}
