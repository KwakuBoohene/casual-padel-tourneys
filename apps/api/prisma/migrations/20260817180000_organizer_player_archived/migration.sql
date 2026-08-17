ALTER TABLE "OrganizerPlayer" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "OrganizerPlayer_organizerId_archivedAt_idx" ON "OrganizerPlayer"("organizerId", "archivedAt");
