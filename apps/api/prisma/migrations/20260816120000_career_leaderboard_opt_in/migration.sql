-- Career leaderboard opt-in (default on) + per-mode career deltas.
ALTER TABLE "Tournament" ADD COLUMN "contributeToCareerLeaderboard" BOOLEAN NOT NULL DEFAULT true;

-- Existing deltas were written by King of the Court (formerly Hill) scoring only; backfill
-- them, then drop the default so new rows must name their source mode explicitly.
ALTER TABLE "OrganizerPlayerStatDelta"
  ADD COLUMN "tournamentMode" "TournamentMode" NOT NULL DEFAULT 'KING_OF_THE_HILL';
ALTER TABLE "OrganizerPlayerStatDelta" ALTER COLUMN "tournamentMode" DROP DEFAULT;

CREATE INDEX "OrganizerPlayerStatDelta_org_mode_occurredAt_idx"
  ON "OrganizerPlayerStatDelta"("organizerId", "tournamentMode", "occurredAt");
