import { prisma } from "../../../lib/prisma.js";
import type { AdminAccessStore } from "../application/access.js";

export class PrismaAdminAccessStore implements AdminAccessStore {
  async isAdmin(actorUserId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { isGuest: true, emailVerifiedAt: true, platformAdminGrant: true }
    });
    return Boolean(
      user &&
      !user.isGuest &&
      user.emailVerifiedAt &&
      user.platformAdminGrant &&
      !user.platformAdminGrant.revokedAt
    );
  }

  async recordRead(actorUserId: string, route: string, requestId: string, targetId?: string): Promise<void> {
    await prisma.adminAccessAudit.create({
      data: {
        actorUserId,
        action: "admin.read",
        targetId: targetId ? `${route}#${targetId}` : route,
        requestId
      }
    });
  }
}
