-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "is_apprenticeship" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "riasec_artistic" INTEGER,
ADD COLUMN     "riasec_completed_at" TIMESTAMP(3),
ADD COLUMN     "riasec_conventional" INTEGER,
ADD COLUMN     "riasec_enterprising" INTEGER,
ADD COLUMN     "riasec_investigative" INTEGER,
ADD COLUMN     "riasec_realistic" INTEGER,
ADD COLUMN     "riasec_social" INTEGER;

-- CreateIndex
CREATE INDEX "jobs_is_apprenticeship_idx" ON "jobs"("is_apprenticeship");
