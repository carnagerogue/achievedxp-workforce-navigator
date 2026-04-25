-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "location_postal_code" TEXT;

-- CreateIndex
CREATE INDEX "jobs_location_postal_code_idx" ON "jobs"("location_postal_code");
