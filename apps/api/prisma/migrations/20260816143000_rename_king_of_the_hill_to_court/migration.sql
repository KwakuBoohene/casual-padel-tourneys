-- Idempotent: 20260816140000 already rewrites KING_OF_THE_HILL → KING_OF_THE_COURT.
-- Fresh deploys (and prod, which never had King of the Hill) have no HILL label left to rename.
-- Postgres errors if RENAME VALUE targets a missing enum label, so only rename when it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'TournamentMode'
      AND e.enumlabel = 'KING_OF_THE_HILL'
  ) THEN
    EXECUTE 'ALTER TYPE "TournamentMode" RENAME VALUE ''KING_OF_THE_HILL'' TO ''KING_OF_THE_COURT''';
  END IF;
END $$;
