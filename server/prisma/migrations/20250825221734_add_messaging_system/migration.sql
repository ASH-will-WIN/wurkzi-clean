/*
  Warnings:

  - A unique constraint covering the columns `[account_id]` on the table `stripe_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "stripe_accounts" ADD COLUMN     "current_deadline" TIMESTAMP(3),
ADD COLUMN     "last_sync_at" TIMESTAMP(3),
ADD COLUMN     "requires_action" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "job_id" TEXT,
    "conversation_id" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_accounts_account_id_key" ON "stripe_accounts"("account_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
