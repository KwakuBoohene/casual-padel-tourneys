-- CreateTable
CREATE TABLE "TournamentDraft" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "mode" "TournamentMode" NOT NULL,
    "payload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "keepAccessAfterStart" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "startedTournamentId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentDraft_startedTournamentId_key" ON "TournamentDraft"("startedTournamentId");

-- CreateIndex
CREATE INDEX "TournamentDraft_organizerId_deletedAt_startedTournamentId_u_idx" ON "TournamentDraft"("organizerId", "deletedAt", "startedTournamentId", "updatedAt");

-- AddForeignKey
ALTER TABLE "TournamentDraft" ADD CONSTRAINT "TournamentDraft_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentDraft" ADD CONSTRAINT "TournamentDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentDraft" ADD CONSTRAINT "TournamentDraft_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

