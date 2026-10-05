ALTER TABLE "user_profiles"
  ADD COLUMN "display_name" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "bio" VARCHAR(500),
  ADD COLUMN "avatar_path" TEXT;
