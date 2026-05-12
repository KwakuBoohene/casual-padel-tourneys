-- Add player integration support fields to Tournament
ALTER TABLE "Tournament" ADD COLUMN "integrationWaveCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tournament" ADD COLUMN "enableAutoIntegration" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tournament" ADD COLUMN "integrationThreshold" INTEGER NOT NULL DEFAULT 2;

-- Add player integration tracking fields to Player
ALTER TABLE "Player" ADD COLUMN "gender" TEXT;
ALTER TABLE "Player" ADD COLUMN "handicap" DOUBLE PRECISION;
ALTER TABLE "Player" ADD COLUMN "integrationWave" INTEGER;
ALTER TABLE "Player" ADD COLUMN "integratedAt" TIMESTAMP(3);

-- Create index on Player.tournamentId for performance
CREATE INDEX "Player_tournamentId_idx" ON "Player"("tournamentId");

-- Create PendingPlayer table
CREATE TABLE "PendingPlayer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingPlayer_pkey" PRIMARY KEY ("id")
);

-- Create index on PendingPlayer.tournamentId for performance
CREATE INDEX "PendingPlayer_tournamentId_idx" ON "PendingPlayer"("tournamentId");

-- Add foreign key constraint
ALTER TABLE "PendingPlayer" ADD CONSTRAINT "PendingPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
