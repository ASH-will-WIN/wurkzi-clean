-- AlterEnum
ALTER TYPE "DepositStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "estimated_time" INTEGER;
