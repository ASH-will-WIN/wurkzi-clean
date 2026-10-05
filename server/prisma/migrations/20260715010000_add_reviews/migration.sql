CREATE TABLE "reviews" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "reviewer_id" TEXT NOT NULL,
  "reviewee_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "reviews_job_id_reviewer_id_key" ON "reviews"("job_id", "reviewer_id");
CREATE INDEX "reviews_reviewee_id_idx" ON "reviews"("reviewee_id");
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
