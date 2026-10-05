UPDATE "job_applications"
SET "status" = 'PENDING_PAYMENT'
WHERE "status" = 'APPLIED' AND "depositStatus" = 'PENDING';
