CREATE TYPE "LeaderboardAudience" AS ENUM ('STUDENT', 'NEIGHBOR');
CREATE TYPE "LeaderboardVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "LeaderboardPointAction" AS ENUM ('SUCCESSFUL_REFERRAL', 'STUDENT_JOB_COMPLETED', 'NEIGHBOR_JOB_COMPLETED');

CREATE TABLE "leaderboard_seasons" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leaderboard_seasons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leaderboard_seasons_name_key" ON "leaderboard_seasons"("name");
CREATE INDEX "leaderboard_seasons_is_active_starts_at_ends_at_idx" ON "leaderboard_seasons"("is_active", "starts_at", "ends_at");

CREATE TABLE "leaderboard_participants" (
  "id" TEXT NOT NULL,
  "season_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "audience" "LeaderboardAudience" NOT NULL,
  "nickname" TEXT NOT NULL,
  "school_name" TEXT,
  "school_email" TEXT,
  "verification_status" "LeaderboardVerificationStatus" NOT NULL DEFAULT 'VERIFIED',
  "verified_at" TIMESTAMP(3),
  "points" INTEGER NOT NULL DEFAULT 0,
  "qualifying_job_count" INTEGER NOT NULL DEFAULT 0,
  "successful_referral_count" INTEGER NOT NULL DEFAULT 0,
  "last_point_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leaderboard_participants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leaderboard_participants_season_id_user_id_key" ON "leaderboard_participants"("season_id", "user_id");
CREATE INDEX "leaderboard_participants_season_id_audience_points_idx" ON "leaderboard_participants"("season_id", "audience", "points");
ALTER TABLE "leaderboard_participants" ADD CONSTRAINT "leaderboard_participants_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "leaderboard_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "leaderboard_point_events" (
  "id" TEXT NOT NULL,
  "season_id" TEXT NOT NULL,
  "participant_id" TEXT NOT NULL,
  "action" "LeaderboardPointAction" NOT NULL,
  "points" INTEGER NOT NULL,
  "source_id" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leaderboard_point_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leaderboard_point_events_season_id_action_source_id_key" ON "leaderboard_point_events"("season_id", "action", "source_id");
CREATE INDEX "leaderboard_point_events_participant_id_occurred_at_idx" ON "leaderboard_point_events"("participant_id", "occurred_at");
ALTER TABLE "leaderboard_point_events" ADD CONSTRAINT "leaderboard_point_events_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "leaderboard_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leaderboard_point_events" ADD CONSTRAINT "leaderboard_point_events_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "leaderboard_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "leaderboard_seasons" ("id", "name", "starts_at", "ends_at", "is_active", "updated_at")
VALUES ('cmleaderboardfall2026', 'Fall 2026 Community Challenge', '2026-08-03T04:00:00.000Z', '2027-01-01T04:59:59.999Z', true, CURRENT_TIMESTAMP);
