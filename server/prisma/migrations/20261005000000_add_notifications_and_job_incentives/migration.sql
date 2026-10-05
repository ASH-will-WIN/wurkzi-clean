ALTER TABLE "user_profiles"
  ADD COLUMN "sms_notifications_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sms_consent_at" TIMESTAMP(3),
  ADD COLUMN "sms_opted_out_at" TIMESTAMP(3);

ALTER TABLE "payments"
  ADD COLUMN "credits_restored_at" TIMESTAMP(3),
  ADD COLUMN "paid_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "payments_stripe_payment_id_key" ON "payments"("stripe_payment_id");

CREATE TABLE "job_incentives" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "hirer_id" TEXT NOT NULL,
  "worker_job_number" INTEGER NOT NULL,
  "worker_payout_cents" INTEGER NOT NULL DEFAULT 175,
  "hirer_credit_cents" INTEGER NOT NULL DEFAULT 325,
  "stripe_transfer_id" TEXT,
  "payout_status" TEXT NOT NULL DEFAULT 'PENDING',
  "payout_attempts" INTEGER NOT NULL DEFAULT 0,
  "next_payout_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_payout_error" TEXT,
  "hirer_credit_granted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_incentives_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_incentives_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "job_incentives_job_id_key" ON "job_incentives"("job_id");
CREATE UNIQUE INDEX "job_incentives_worker_id_worker_job_number_key" ON "job_incentives"("worker_id", "worker_job_number");
CREATE UNIQUE INDEX "job_incentives_stripe_transfer_id_key" ON "job_incentives"("stripe_transfer_id");
CREATE INDEX "job_incentives_payout_status_created_at_idx" ON "job_incentives"("payout_status", "created_at");

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "recipient_id" TEXT NOT NULL,
  "source_key" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sms_text" TEXT,
  "href" TEXT NOT NULL,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "notifications_source_key_key" ON "notifications"("source_key");
CREATE INDEX "notifications_recipient_id_read_at_created_at_idx" ON "notifications"("recipient_id", "read_at", "created_at");

CREATE TABLE "sms_deliveries" (
  "id" TEXT NOT NULL,
  "notification_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "twilio_message_sid" TEXT,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sms_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sms_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "sms_deliveries_notification_id_key" ON "sms_deliveries"("notification_id");
CREATE UNIQUE INDEX "sms_deliveries_twilio_message_sid_key" ON "sms_deliveries"("twilio_message_sid");
CREATE INDEX "sms_deliveries_status_next_attempt_at_idx" ON "sms_deliveries"("status", "next_attempt_at");
