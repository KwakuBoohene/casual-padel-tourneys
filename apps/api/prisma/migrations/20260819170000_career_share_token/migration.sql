-- Opt-in public link to an organizer's career board.
-- Nullable with no default and no backfill: every existing account starts un-shared, and
-- Postgres permits many NULLs under a unique index.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "careerShareToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_careerShareToken_key" ON "User"("careerShareToken");
