-- CreateTable
CREATE TABLE "TournamentCollaborator" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceDraftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TournamentCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentCollaborator_userId_revokedAt_idx" ON "TournamentCollaborator"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentCollaborator_tournamentId_userId_key" ON "TournamentCollaborator"("tournamentId", "userId");

-- AddForeignKey
ALTER TABLE "TournamentCollaborator" ADD CONSTRAINT "TournamentCollaborator_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentCollaborator" ADD CONSTRAINT "TournamentCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

