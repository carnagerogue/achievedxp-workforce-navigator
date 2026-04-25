-- CreateEnum
CREATE TYPE "ConvictionCategory" AS ENUM ('FELONY', 'MISDEMEANOR', 'INFRACTION');

-- CreateEnum
CREATE TYPE "OffenseType" AS ENUM ('DRUG_POSSESSION', 'DRUG_DISTRIBUTION', 'VIOLENT', 'SEX_OFFENSE', 'PROPERTY_THEFT', 'PROPERTY_BURGLARY', 'FINANCIAL_FRAUD', 'WEAPONS', 'DUI', 'OTHER');

-- CreateTable
CREATE TABLE "convictions" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "category" "ConvictionCategory" NOT NULL,
    "offense_type" "OffenseType" NOT NULL,
    "conviction_year" INTEGER,
    "release_year" INTEGER,
    "currently_incarcerated" BOOLEAN NOT NULL DEFAULT false,
    "on_parole" BOOLEAN NOT NULL DEFAULT false,
    "on_probation" BOOLEAN NOT NULL DEFAULT false,
    "supervision_end_date" TIMESTAMP(3),
    "sex_offender_registry" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "convictions_profile_id_idx" ON "convictions"("profile_id");

-- CreateIndex
CREATE INDEX "convictions_offense_type_idx" ON "convictions"("offense_type");

-- AddForeignKey
ALTER TABLE "convictions" ADD CONSTRAINT "convictions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
