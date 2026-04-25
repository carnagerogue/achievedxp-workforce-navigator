-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMP', 'INTERNSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DUPLICATE', 'REJECTED');

-- CreateEnum
CREATE TYPE "RawIngestStatus" AS ENUM ('PENDING', 'NORMALIZED', 'FAILED', 'DUPLICATE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "location_city" TEXT,
    "location_region" TEXT,
    "location_postal_code" TEXT,
    "years_experience" INTEGER NOT NULL DEFAULT 0,
    "has_transportation" BOOLEAN NOT NULL DEFAULT false,
    "willing_to_relocate" BOOLEAN NOT NULL DEFAULT false,
    "has_felony_record" BOOLEAN NOT NULL DEFAULT false,
    "offense_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "years_since_release" INTEGER,
    "on_parole_or_probation" BOOLEAN NOT NULL DEFAULT false,
    "restricted_industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "desired_industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_sources" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "base_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_fetched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_raw_ingestion" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RawIngestStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "normalized_job_id" UUID,

    CONSTRAINT "job_raw_ingestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "dedup_hash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "apply_url" TEXT NOT NULL,
    "location_city" TEXT,
    "location_region" TEXT,
    "location_country" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "industry" TEXT,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT DEFAULT 'USD',
    "required_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required_certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "min_years_experience" INTEGER,
    "risk_tier" "RiskTier" NOT NULL DEFAULT 'MEDIUM',
    "background_check_likely" BOOLEAN NOT NULL DEFAULT true,
    "excludes_felons" BOOLEAN NOT NULL DEFAULT false,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "posted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_scores" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "category" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "issuer" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_location_region_idx" ON "user_profiles"("location_region");

-- CreateIndex
CREATE UNIQUE INDEX "job_sources_code_key" ON "job_sources"("code");

-- CreateIndex
CREATE INDEX "job_raw_ingestion_status_fetched_at_idx" ON "job_raw_ingestion"("status", "fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_raw_ingestion_source_id_external_id_key" ON "job_raw_ingestion"("source_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_dedup_hash_key" ON "jobs"("dedup_hash");

-- CreateIndex
CREATE INDEX "jobs_industry_location_region_posted_at_idx" ON "jobs"("industry", "location_region", "posted_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_status_posted_at_idx" ON "jobs"("status", "posted_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_risk_tier_idx" ON "jobs"("risk_tier");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_source_id_external_id_key" ON "jobs"("source_id", "external_id");

-- CreateIndex
CREATE INDEX "job_scores_user_id_score_idx" ON "job_scores"("user_id", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "job_scores_user_id_job_id_key" ON "job_scores"("user_id", "job_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_code_key" ON "skills"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_code_key" ON "certifications"("code");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_raw_ingestion" ADD CONSTRAINT "job_raw_ingestion_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "job_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "job_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_scores" ADD CONSTRAINT "job_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_scores" ADD CONSTRAINT "job_scores_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
