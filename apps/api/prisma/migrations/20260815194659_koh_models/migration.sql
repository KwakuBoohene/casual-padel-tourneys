-- CreateEnum
CREATE TYPE "KohPairingMode" AS ENUM ('WINNER_STAYS', 'ROUND_ROBIN_PAIRS');

-- CreateEnum
CREATE TYPE "KohGameWinMethod" AS ENUM ('REGULAR', 'GOLDEN', 'STAR');

-- AlterEnum
ALTER TYPE "TournamentMode" ADD VALUE 'KING_OF_THE_HILL';

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "pairingMode" "KohPairingMode";

-- CreateTable
CREATE TABLE "KohCourt" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "courtNumber" INTEGER NOT NULL,

    CONSTRAINT "KohCourt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KohUnit" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT NOT NULL,
    "queuePosition" INTEGER NOT NULL,
    "matchesWon" INTEGER NOT NULL DEFAULT 0,
    "matchesLost" INTEGER NOT NULL DEFAULT 0,
    "kingWinStreak" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KohUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KohPromotionRule" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "courtNumber" INTEGER NOT NULL,
    "winsRequired" INTEGER NOT NULL,
    "promoteToCourtNumber" INTEGER,

    CONSTRAINT "KohPromotionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KohMatch" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "unitAId" TEXT NOT NULL,
    "unitBId" TEXT NOT NULL,
    "winnerUnitId" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KohMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KohMatchSet" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "gamesA" INTEGER NOT NULL,
    "gamesB" INTEGER NOT NULL,
    "tbA" INTEGER,
    "tbB" INTEGER,
    "winMethodsA" "KohGameWinMethod"[],
    "winMethodsB" "KohGameWinMethod"[],

    CONSTRAINT "KohMatchSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KohCourt_tournamentId_idx" ON "KohCourt"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "KohCourt_tournamentId_courtNumber_key" ON "KohCourt"("tournamentId", "courtNumber");

-- CreateIndex
CREATE INDEX "KohUnit_courtId_idx" ON "KohUnit"("courtId");

-- CreateIndex
CREATE INDEX "KohUnit_playerAId_idx" ON "KohUnit"("playerAId");

-- CreateIndex
CREATE INDEX "KohUnit_playerBId_idx" ON "KohUnit"("playerBId");

-- CreateIndex
CREATE UNIQUE INDEX "KohUnit_courtId_queuePosition_key" ON "KohUnit"("courtId", "queuePosition");

-- CreateIndex
CREATE INDEX "KohPromotionRule_tournamentId_idx" ON "KohPromotionRule"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "KohPromotionRule_tournamentId_courtNumber_key" ON "KohPromotionRule"("tournamentId", "courtNumber");

-- CreateIndex
CREATE INDEX "KohMatch_courtId_idx" ON "KohMatch"("courtId");

-- CreateIndex
CREATE INDEX "KohMatch_unitAId_idx" ON "KohMatch"("unitAId");

-- CreateIndex
CREATE INDEX "KohMatch_unitBId_idx" ON "KohMatch"("unitBId");

-- CreateIndex
CREATE INDEX "KohMatchSet_matchId_idx" ON "KohMatchSet"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "KohMatchSet_matchId_setNumber_key" ON "KohMatchSet"("matchId", "setNumber");

-- AddForeignKey
ALTER TABLE "KohCourt" ADD CONSTRAINT "KohCourt_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KohUnit" ADD CONSTRAINT "KohUnit_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "KohCourt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KohUnit" ADD CONSTRAINT "KohUnit_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KohUnit" ADD CONSTRAINT "KohUnit_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KohPromotionRule" ADD CONSTRAINT "KohPromotionRule_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KohMatch" ADD CONSTRAINT "KohMatch_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "KohCourt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KohMatch" ADD CONSTRAINT "KohMatch_unitAId_fkey" FOREIGN KEY ("unitAId") REFERENCES "KohUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KohMatch" ADD CONSTRAINT "KohMatch_unitBId_fkey" FOREIGN KEY ("unitBId") REFERENCES "KohUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KohMatch" ADD CONSTRAINT "KohMatch_winnerUnitId_fkey" FOREIGN KEY ("winnerUnitId") REFERENCES "KohUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KohMatchSet" ADD CONSTRAINT "KohMatchSet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "KohMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
