import { USAGE_AGGREGATE_MONTHS, USAGE_RAW_DAYS } from "@padel/shared";
import { prisma } from "../../../lib/prisma.js";

export async function pruneUsage(now = new Date()): Promise<number> {
  const raw = new Date(now.getTime() - USAGE_RAW_DAYS * 86_400_000);
  const aggregate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - USAGE_AGGREGATE_MONTHS, 1));
  const lastDay = new Date(Date.UTC(aggregate.getUTCFullYear(), aggregate.getUTCMonth() + 1, 0)).getUTCDate();
  aggregate.setUTCDate(Math.min(now.getUTCDate(), lastDay));
  const audit = new Date(now);
  audit.setUTCFullYear(audit.getUTCFullYear() - 1);
  return prisma.$transaction(async (tx) => {
    const [events, days, audits] = await Promise.all([
      tx.usageEvent.findMany({ where: { occurredAt: { lt: raw } }, select: { id: true }, take: 1000 }),
      tx.usageDay.findMany({ where: { day: { lt: aggregate } }, take: 1000 }),
      tx.adminAccessAudit.findMany({ where: { createdAt: { lt: audit } }, select: { id: true }, take: 1000 })
    ]);
    await tx.usageEvent.deleteMany({ where: { id: { in: events.map((event) => event.id) } } });
    if (days.length)
      await tx.usageDay.deleteMany({
        where: { OR: days.map(({ day, surface, kind }) => ({ day, surface, kind })) }
      });
    await tx.adminAccessAudit.deleteMany({ where: { id: { in: audits.map((event) => event.id) } } });
    return events.length + days.length + audits.length;
  });
}
