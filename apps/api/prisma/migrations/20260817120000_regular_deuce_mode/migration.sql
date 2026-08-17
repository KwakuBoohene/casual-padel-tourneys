-- CreateEnum
CREATE TYPE "RegularDeuceMode" AS ENUM ('ADVANTAGE', 'GOLDEN', 'STAR');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "regularDeuceMode" "RegularDeuceMode";

-- AlterTable
ALTER TABLE "MatchSet" ADD COLUMN "winMethodsA" "KohGameWinMethod"[] DEFAULT ARRAY[]::"KohGameWinMethod"[];
ALTER TABLE "MatchSet" ADD COLUMN "winMethodsB" "KohGameWinMethod"[] DEFAULT ARRAY[]::"KohGameWinMethod"[];
