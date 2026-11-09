import "dotenv/config";
import { prisma } from "../lib/prisma.js";

const [command, userId] = process.argv.slice(2);
try {
  if (command === "prune" && !userId) {
    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
    const rows = await prisma.adminAccessAudit.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      take: 1000
    });
    await prisma.adminAccessAudit.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
    console.log(`Pruned ${rows.length} expired audit entries.`);
  } else if (["grant", "revoke"].includes(command) && userId) {
    await prisma.$transaction(async (tx) => {
      if (command === "grant") {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || user.isGuest || !user.emailVerifiedAt)
          throw new Error("A verified registered account is required.");
        await tx.platformAdminGrant.upsert({
          where: { userId },
          create: { userId },
          update: { revokedAt: null, grantedAt: new Date() }
        });
      } else {
        await tx.platformAdminGrant.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() }
        });
      }
      await tx.adminAccessAudit.create({ data: { action: `admin.${command}`, targetId: userId } });
    });
    console.log(`Admin ${command} completed.`);
  } else throw new Error("Usage: platform-admin grant|revoke <user-id>, or platform-admin prune");
} finally {
  await prisma.$disconnect();
}
