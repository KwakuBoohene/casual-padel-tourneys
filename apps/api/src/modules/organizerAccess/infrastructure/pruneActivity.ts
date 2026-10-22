import { prisma } from "../../../lib/prisma.js";

/** Bounded, owner-scoped maintenance when activity is viewed; no additional worker service. */
export async function pruneExpiredOrganizerActivity(organizerId: string, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const rows = await prisma.organizerActivity.findMany({
    where: { organizerId, occurredAt: { lt: cutoff } },
    select: { id: true },
    take: 200
  });
  if (rows.length)
    await prisma.organizerActivity.deleteMany({
      where: { organizerId, id: { in: rows.map((row) => row.id) } }
    });
}
