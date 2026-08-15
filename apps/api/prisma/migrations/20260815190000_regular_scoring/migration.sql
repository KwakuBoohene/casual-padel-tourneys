-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('AMERICANO_POINTS', 'REGULAR');
CREATE TYPE "RegularSetFormat" AS ENUM ('BO3_GAMES', 'BO5_GAMES', 'FULL_SET');

-- AlterTable Tournament
ALTER TABLE "Tournament" ADD COLUMN "scoringMode" "ScoringMode" NOT NULL DEFAULT 'AMERICANO_POINTS';
ALTER TABLE "Tournament" ADD COLUMN "regularSetFormat" "RegularSetFormat";
ALTER TABLE "Tournament" ADD COLUMN "regularGameWinBy" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN "regularSetsToWin" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN "regularSetTiebreakTo" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN "regularMatchTiebreak" BOOLEAN;

-- AlterTable Player
ALTER TABLE "Player" ADD COLUMN "matchesWon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN "matchesLost" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN "setsWon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN "setsLost" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN "gamesWon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN "gamesLost" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Match
ALTER TABLE "Match" ADD COLUMN "matchTbA" INTEGER;
ALTER TABLE "Match" ADD COLUMN "matchTbB" INTEGER;

-- CreateTable MatchSet
CREATE TABLE "MatchSet" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "gamesA" INTEGER NOT NULL,
    "gamesB" INTEGER NOT NULL,
    "tbA" INTEGER,
    "tbB" INTEGER,

    CONSTRAINT "MatchSet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchSet_matchId_setNumber_key" ON "MatchSet"("matchId", "setNumber");
CREATE INDEX "MatchSet_matchId_idx" ON "MatchSet"("matchId");

ALTER TABLE "MatchSet" ADD CONSTRAINT "MatchSet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
