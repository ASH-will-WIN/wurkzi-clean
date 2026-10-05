/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_hirer_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_hirer_id_fkey";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "stripe_payment_id" TEXT;

-- DropTable
DROP TABLE "User";
