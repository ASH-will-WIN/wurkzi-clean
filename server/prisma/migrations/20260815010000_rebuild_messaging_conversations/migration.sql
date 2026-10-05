-- This is an intentional fresh start for Wurkzi messaging.
-- It permanently deletes all existing message history before rebuilding the schema.
TRUNCATE TABLE "messages";

CREATE TABLE "conversations" (
  "id" TEXT NOT NULL,
  "conversation_key" TEXT NOT NULL,
  "participant_one_id" TEXT NOT NULL,
  "participant_two_id" TEXT NOT NULL,
  "job_id" TEXT,
  "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversations_participants_ordered" CHECK ("participant_one_id" < "participant_two_id")
);

CREATE UNIQUE INDEX "conversations_conversation_key_key" ON "conversations"("conversation_key");
CREATE INDEX "conversations_participant_one_id_last_message_at_idx" ON "conversations"("participant_one_id", "last_message_at");
CREATE INDEX "conversations_participant_two_id_last_message_at_idx" ON "conversations"("participant_two_id", "last_message_at");
CREATE INDEX "conversations_job_id_idx" ON "conversations"("job_id");

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "messages"
  DROP COLUMN "image_url",
  DROP COLUMN "receiver_id",
  DROP COLUMN "job_id",
  DROP COLUMN "conversation_id";

ALTER TABLE "messages"
  ADD COLUMN "conversation_id" TEXT NOT NULL,
  ADD COLUMN "image_path" TEXT;

ALTER TABLE "messages" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "messages" RENAME COLUMN "updatedAt" TO "updated_at";

CREATE INDEX "messages_conversation_id_created_at_id_idx" ON "messages"("conversation_id", "created_at", "id");

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_blocks" (
  "id" TEXT NOT NULL,
  "blocker_id" TEXT NOT NULL,
  "blocked_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_blocks_not_self" CHECK ("blocker_id" <> "blocked_id")
);

CREATE UNIQUE INDEX "user_blocks_blocker_id_blocked_id_key" ON "user_blocks"("blocker_id", "blocked_id");
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");
