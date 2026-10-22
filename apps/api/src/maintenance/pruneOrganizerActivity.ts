import "dotenv/config";
import { prisma } from "../lib/prisma.js";

/** Run from a Coolify scheduled command; delete bounded batches, leaving recent history intact. */
async function main() {
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  let removed = 0;
  for (let batch = 0; batch < 20; batch += 1) {
    const rows = await prisma.organizerActivity.findMany({
      where: { occurredAt: { lt: cutoff } },
      select: { id: true },
      take: 500
    });
    if (!rows.length) break;
    removed += (
      await prisma.organizerActivity.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } })
    ).count;
  }
  console.info(`Removed ${removed} organizer activity entries older than one year.`);
}
void main()
  .catch(() => {
    console.error("Organizer activity cleanup failed.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
