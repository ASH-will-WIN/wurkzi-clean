ALTER TABLE "jobs"
ADD COLUMN "provides_resources" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "required_resources" TEXT;
