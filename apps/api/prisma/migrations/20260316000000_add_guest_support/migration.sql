-- AlterTable: make googleId nullable, add guestId and isGuest columns
ALTER TABLE "User" ALTER COLUMN "googleId" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "guestId" TEXT;
ALTER TABLE "User" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: unique constraint on guestId (allows NULLs, only enforces on non-NULL values)
CREATE UNIQUE INDEX "User_guestId_key" ON "User"("guestId");
