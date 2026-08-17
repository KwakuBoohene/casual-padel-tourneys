-- Career board ranks matches > sets > games; persist set wins on each credited match.
ALTER TABLE "OrganizerPlayerStatDelta" ADD COLUMN IF NOT EXISTS "setsWon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrganizerPlayerStatDelta" ADD COLUMN IF NOT EXISTS "setsLost" INTEGER NOT NULL DEFAULT 0;

-- Existing KOH / points credits treated each completed match as one set.
UPDATE "OrganizerPlayerStatDelta"
SET "setsWon" = "matchesWon",
    "setsLost" = "matchesLost"
WHERE "setsWon" = 0 AND "setsLost" = 0;
