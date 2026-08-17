-- Rename TournamentMode KING_OF_THE_HILL → KING_OF_THE_COURT (product: King of the Court).
-- Recreate the enum so the legacy value is removed after data rewrite.
-- Also rewrites OrganizerPlayerStatDelta.tournamentMode when that column exists (career board).

ALTER TYPE "TournamentMode" RENAME TO "TournamentMode_old";

CREATE TYPE "TournamentMode" AS ENUM ('AMERICANO', 'MEXICANO', 'KING_OF_THE_COURT');

ALTER TABLE "Tournament"
  ALTER COLUMN "mode" TYPE "TournamentMode"
  USING (
    CASE
      WHEN "mode"::text = 'KING_OF_THE_HILL' THEN 'KING_OF_THE_COURT'::"TournamentMode"
      ELSE "mode"::text::"TournamentMode"
    END
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'OrganizerPlayerStatDelta'
      AND column_name = 'tournamentMode'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE "OrganizerPlayerStatDelta"
        ALTER COLUMN "tournamentMode" TYPE "TournamentMode"
        USING (
          CASE
            WHEN "tournamentMode"::text = 'KING_OF_THE_HILL' THEN 'KING_OF_THE_COURT'::"TournamentMode"
            ELSE "tournamentMode"::text::"TournamentMode"
          END
        )
    $sql$;
  END IF;
END $$;

DROP TYPE "TournamentMode_old";
