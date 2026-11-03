CREATE TABLE "PlatformAdminGrant" (
    "userId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "PlatformAdminGrant_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "PlatformAdminGrant" ADD CONSTRAINT "PlatformAdminGrant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "AdminAccessAudit" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAccessAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminAccessAudit_createdAt_idx" ON "AdminAccessAudit"("createdAt");
CREATE INDEX "AdminAccessAudit_actorUserId_createdAt_idx" ON "AdminAccessAudit"("actorUserId", "createdAt");
