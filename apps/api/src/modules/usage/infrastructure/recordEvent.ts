import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { usageEnabled } from "../domain/policy.js";

export async function recordUsageEvent(
  tx: Prisma.TransactionClient,
  event: Prisma.UsageEventCreateManyInput
): Promise<void> {
  const source = event.kind === "visit" ? "visits" : "business";
  if (!usageEnabled(source)) return;
  const occurredAt = event.occurredAt ? new Date(event.occurredAt) : new Date();
  const result = await tx.usageEvent.createMany({ data: [{ ...event, occurredAt }], skipDuplicates: true });
  if (!result.count) return;
  await tx.usageCoverage.upsert({ where: { source }, create: { source, startedAt: occurredAt }, update: {} });
  const day = new Date(occurredAt);
  day.setUTCHours(0, 0, 0, 0);
  const key = { day, surface: event.surface, kind: event.kind };
  await tx.usageDay.upsert({
    where: { day_surface_kind: key },
    create: { ...key, count: 1 },
    update: { count: { increment: 1 } }
  });
}
export async function recordLogin(actorUserId: string, id: string): Promise<void> {
  if (!usageEnabled("business")) return;
  await prisma.$transaction(async (tx) => {
    await recordUsageEvent(tx, { id: `login:${id}`, kind: "login", surface: "organizer", actorUserId });
  });
}
export async function recordConversion(
  tx: Prisma.TransactionClient,
  before: { isGuest: boolean },
  after: { id: string; isGuest: boolean }
): Promise<void> {
  if (before.isGuest && !after.isGuest)
    await recordUsageEvent(tx, {
      id: `conversion:${after.id}`,
      kind: "account.converted",
      surface: "organizer",
      actorUserId: after.id,
      targetId: after.id
    });
}
