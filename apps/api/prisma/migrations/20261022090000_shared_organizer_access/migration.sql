-- CreateTable
CREATE TABLE "OrganizerMembership" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,

    CONSTRAINT "OrganizerMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizerInvitation" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "invitedEmailNormalized" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lastSentAt" TIMESTAMP(3),
    "sendAttempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrganizerInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizerActivity" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "OrganizerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizerMembership_memberUserId_revokedAt_idx" ON "OrganizerMembership"("memberUserId", "revokedAt");

-- CreateIndex
CREATE INDEX "OrganizerMembership_organizerId_revokedAt_idx" ON "OrganizerMembership"("organizerId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerMembership_organizerId_memberUserId_key" ON "OrganizerMembership"("organizerId", "memberUserId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerInvitation_tokenHash_key" ON "OrganizerInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "OrganizerInvitation_organizerId_invitedEmailNormalized_idx" ON "OrganizerInvitation"("organizerId", "invitedEmailNormalized");

-- CreateIndex
CREATE INDEX "OrganizerActivity_organizerId_occurredAt_id_idx" ON "OrganizerActivity"("organizerId", "occurredAt", "id");

-- AddForeignKey
ALTER TABLE "OrganizerMembership" ADD CONSTRAINT "OrganizerMembership_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerMembership" ADD CONSTRAINT "OrganizerMembership_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerInvitation" ADD CONSTRAINT "OrganizerInvitation_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerActivity" ADD CONSTRAINT "OrganizerActivity_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A user cannot delegate their own ownership, and pending invitations have one active secret.
ALTER TABLE "OrganizerMembership" ADD CONSTRAINT "OrganizerMembership_not_self" CHECK ("organizerId" <> "memberUserId");
ALTER TABLE "OrganizerMembership" ADD CONSTRAINT "OrganizerMembership_manager_role" CHECK ("role" = 'MANAGER');
CREATE UNIQUE INDEX "OrganizerInvitation_one_pending_email" ON "OrganizerInvitation" ("organizerId", "invitedEmailNormalized") WHERE "acceptedAt" IS NULL AND "revokedAt" IS NULL;
