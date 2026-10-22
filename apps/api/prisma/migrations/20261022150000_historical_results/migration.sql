-- CreateTable
CREATE TABLE "HistoricalResultImport" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "mode" "TournamentMode" NOT NULL,
    "variant" TEXT,
    "scoringMode" "ScoringMode" NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalResultImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalResultRevision" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "requestKey" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "source" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalResultRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalPlayerResult" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "organizerPlayerId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceRank" INTEGER NOT NULL,
    "matchesWon" INTEGER NOT NULL,
    "matchesLost" INTEGER NOT NULL,
    "matchesDrawn" INTEGER NOT NULL,
    "gamesWon" INTEGER,
    "gamesLost" INTEGER,
    "setsWon" INTEGER,
    "setsLost" INTEGER,
    "americanoPointsWon" INTEGER,
    "americanoPointsLost" INTEGER,
    "sourcePoints" INTEGER,
    "sourceFile" TEXT NOT NULL,
    "notes" TEXT NOT NULL,

    CONSTRAINT "HistoricalPlayerResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricalResultImport_organizerId_eventDate_idx" ON "HistoricalResultImport"("organizerId", "eventDate");

-- CreateIndex
CREATE INDEX "HistoricalResultImport_organizerId_fingerprint_idx" ON "HistoricalResultImport"("organizerId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalResultImport_organizerId_eventKey_key" ON "HistoricalResultImport"("organizerId", "eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalResultRevision_requestKey_key" ON "HistoricalResultRevision"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalResultRevision_importId_number_key" ON "HistoricalResultRevision"("importId", "number");

-- CreateIndex
CREATE INDEX "HistoricalPlayerResult_organizerPlayerId_idx" ON "HistoricalPlayerResult"("organizerPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalPlayerResult_revisionId_organizerPlayerId_key" ON "HistoricalPlayerResult"("revisionId", "organizerPlayerId");

-- AddForeignKey
ALTER TABLE "HistoricalResultImport" ADD CONSTRAINT "HistoricalResultImport_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalResultRevision" ADD CONSTRAINT "HistoricalResultRevision_importId_fkey" FOREIGN KEY ("importId") REFERENCES "HistoricalResultImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalPlayerResult" ADD CONSTRAINT "HistoricalPlayerResult_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "HistoricalResultRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalPlayerResult" ADD CONSTRAINT "HistoricalPlayerResult_organizerPlayerId_fkey" FOREIGN KEY ("organizerPlayerId") REFERENCES "OrganizerPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

