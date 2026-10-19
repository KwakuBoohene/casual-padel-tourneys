-- Void marker for matches the organizer closed the event without playing.
-- Nullable with no default and no backfill: existing rows stay NULL (= not voided),
-- so behaviour is unchanged for every event closed before this migration.
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);

ALTER TABLE "KohMatch" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
