ALTER TABLE "user_profiles" ADD COLUMN "referral_code" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "referred_by_id" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "platform_credit_cents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_profiles" ADD COLUMN "posting_discount_count" INTEGER NOT NULL DEFAULT 0;
UPDATE "user_profiles" SET "referral_code" = 'WRK-' || UPPER(SUBSTRING(MD5("id" || RANDOM()::TEXT), 1, 8)) WHERE "referral_code" IS NULL;
ALTER TABLE "user_profiles" ALTER COLUMN "referral_code" SET NOT NULL;
CREATE UNIQUE INDEX "user_profiles_referral_code_key" ON "user_profiles"("referral_code");

ALTER TABLE "job_applications" ADD COLUMN "deposit_credit_applied_cents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN "referral_credit_applied_cents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN "referral_discount_cents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "referrals" (
  "id" TEXT NOT NULL,
  "referrer_id" TEXT NOT NULL,
  "referred_id" TEXT NOT NULL,
  "worker_reward_granted_at" TIMESTAMP(3),
  "neighbor_reward_granted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referrals_referred_id_key" ON "referrals"("referred_id");
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

CREATE TYPE "ReferralRewardType" AS ENUM ('WORKER_CREDIT', 'NEIGHBOR_POSTING_DISCOUNT');
CREATE TABLE "referral_rewards" (
  "id" TEXT NOT NULL,
  "referral_id" TEXT NOT NULL,
  "recipient_id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "type" "ReferralRewardType" NOT NULL,
  "amount_cents" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referral_rewards_referral_id_recipient_id_type_key" ON "referral_rewards"("referral_id", "recipient_id", "type");
CREATE INDEX "referral_rewards_recipient_id_idx" ON "referral_rewards"("recipient_id");
