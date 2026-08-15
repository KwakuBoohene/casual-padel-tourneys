-- KohUnit ranking stats (W–L already present; add special + game differentials).
ALTER TABLE "KohUnit" ADD COLUMN "specialLosses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "KohUnit" ADD COLUMN "gamesWon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "KohUnit" ADD COLUMN "gamesLost" INTEGER NOT NULL DEFAULT 0;
