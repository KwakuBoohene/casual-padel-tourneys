CREATE TYPE "TournamentMode" AS ENUM ('AMERICANO', 'MEXICANO');
CREATE TYPE "TournamentVariant" AS ENUM ('CLASSIC', 'MIXED', 'TEAM');

CREATE TABLE "Tournament" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "mode" "TournamentMode" NOT NULL,
  "variant" "TournamentVariant" NOT NULL,
  "courts" INTEGER NOT NULL,
  "pointsPerMatch" INTEGER NOT NULL,
  "targetGamesPerPlayer" INTEGER,
  "tournamentTimeMinutes" INTEGER,
  "publicToken" TEXT NOT NULL UNIQUE,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Player" (
  "id" TEXT PRIMARY KEY,
  "tournamentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
  "totalPoints" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Player_tournament_fk" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE
);

CREATE TABLE "Round" (
  "id" TEXT PRIMARY KEY,
  "tournamentId" TEXT NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "isLocked" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "Round_tournament_fk" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE
);

CREATE TABLE "Match" (
  "id" TEXT PRIMARY KEY,
  "roundId" TEXT NOT NULL,
  "court" INTEGER NOT NULL,
  "teamA" TEXT[] NOT NULL,
  "teamB" TEXT[] NOT NULL,
  "scoreA" INTEGER,
  "scoreB" INTEGER,
  "completed" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "Match_round_fk" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE
);
