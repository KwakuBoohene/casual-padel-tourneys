-- CreateEnum
CREATE TYPE "SchedulingMode" AS ENUM ('TARGET_GAMES', 'TOTAL_TIME', 'ROUND_ROBIN');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "schedulingMode" "SchedulingMode" NOT NULL DEFAULT 'TARGET_GAMES';
