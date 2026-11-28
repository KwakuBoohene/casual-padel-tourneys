-- CreateTable
CREATE TABLE "DraftCollaborator" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "DraftCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftInvitation" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "invitedEmailNormalized" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lastSentAt" TIMESTAMP(3),
    "sendAttempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DraftInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftCollaborator_userId_revokedAt_idx" ON "DraftCollaborator"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DraftCollaborator_draftId_userId_key" ON "DraftCollaborator"("draftId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftInvitation_tokenHash_key" ON "DraftInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "DraftInvitation_draftId_invitedEmailNormalized_idx" ON "DraftInvitation"("draftId", "invitedEmailNormalized");

-- AddForeignKey
ALTER TABLE "DraftCollaborator" ADD CONSTRAINT "DraftCollaborator_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "TournamentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftCollaborator" ADD CONSTRAINT "DraftCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftInvitation" ADD CONSTRAINT "DraftInvitation_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "TournamentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

