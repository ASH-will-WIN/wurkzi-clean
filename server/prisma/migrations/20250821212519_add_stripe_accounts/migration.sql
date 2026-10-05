/*
  Warnings:

  - You are about to drop the `workers` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `platformFee` on table `payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workerAmount` on table `payments` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "job_applications" DROP CONSTRAINT "job_applications_worker_id_fkey";

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "platformFee" SET NOT NULL,
ALTER COLUMN "workerAmount" SET NOT NULL;

-- DropTable
DROP TABLE "workers";

-- DropEnum
DROP TYPE "Visibility";

-- CreateTable
CREATE TABLE "stripe_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "charges_enabled" BOOLEAN NOT NULL DEFAULT false,
    "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "details_submitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_accounts_user_id_key" ON "stripe_accounts"("user_id");
