-- Account-scoped KOH career players + per-match deltas.
CREATE TABLE "OrganizerPlayer" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizerPlayerStatDelta" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "organizerPlayerId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "tournamentName" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "gamesLost" INTEGER NOT NULL DEFAULT 0,
    "matchesWon" INTEGER NOT NULL DEFAULT 0,
    "matchesLost" INTEGER NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizerPlayerStatDelta_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Player" ADD COLUMN "organizerPlayerId" TEXT;

CREATE UNIQUE INDEX "OrganizerPlayer_organizerId_nameNormalized_key" ON "OrganizerPlayer"("organizerId", "nameNormalized");
CREATE INDEX "OrganizerPlayer_organizerId_idx" ON "OrganizerPlayer"("organizerId");
CREATE UNIQUE INDEX "OrganizerPlayerStatDelta_matchId_organizerPlayerId_key" ON "OrganizerPlayerStatDelta"("matchId", "organizerPlayerId");
CREATE INDEX "OrganizerPlayerStatDelta_organizerId_occurredAt_idx" ON "OrganizerPlayerStatDelta"("organizerId", "occurredAt");
CREATE INDEX "OrganizerPlayerStatDelta_organizerPlayerId_occurredAt_idx" ON "OrganizerPlayerStatDelta"("organizerPlayerId", "occurredAt");
CREATE INDEX "Player_organizerPlayerId_idx" ON "Player"("organizerPlayerId");

ALTER TABLE "OrganizerPlayer" ADD CONSTRAINT "OrganizerPlayer_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerPlayerStatDelta" ADD CONSTRAINT "OrganizerPlayerStatDelta_organizerPlayerId_fkey" FOREIGN KEY ("organizerPlayerId") REFERENCES "OrganizerPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Player" ADD CONSTRAINT "Player_organizerPlayerId_fkey" FOREIGN KEY ("organizerPlayerId") REFERENCES "OrganizerPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
