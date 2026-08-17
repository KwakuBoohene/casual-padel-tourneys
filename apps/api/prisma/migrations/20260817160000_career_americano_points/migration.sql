-- Rally points from Americano scoring stay off regular games won/lost.
ALTER TABLE "OrganizerPlayerStatDelta" ADD COLUMN IF NOT EXISTS "americanoPointsWon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrganizerPlayerStatDelta" ADD COLUMN IF NOT EXISTS "americanoPointsLost" INTEGER NOT NULL DEFAULT 0;

UPDATE "OrganizerPlayerStatDelta" AS d
SET
  "americanoPointsWon" = d."gamesWon",
  "americanoPointsLost" = d."gamesLost",
  "gamesWon" = CASE WHEN d."matchesWon" = 1 THEN 1 ELSE 0 END,
  "gamesLost" = CASE WHEN d."matchesLost" = 1 THEN 1 ELSE 0 END,
  "setsWon" = 0,
  "setsLost" = 0
FROM "Tournament" AS t
WHERE t."id" = d."tournamentId"
  AND t."scoringMode" = 'AMERICANO_POINTS'
  AND d."tournamentMode" IN ('AMERICANO', 'MEXICANO');
