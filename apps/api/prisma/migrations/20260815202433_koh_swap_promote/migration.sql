-- AlterTable
ALTER TABLE "KohCourt" ADD COLUMN     "tempSwapInUnitId" TEXT,
ADD COLUMN     "tempSwapOutUnitId" TEXT,
ADD COLUMN     "tempSwapReason" TEXT,
ADD COLUMN     "tempSwapSlot" TEXT;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "kohPendingPromote" JSONB;
