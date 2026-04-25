// Shared DTO/type surface used by both the API and the (Phase-3) Next.js
// frontend. Keep this file small and free of runtime deps.

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

export type ConvictionCategory = 'FELONY' | 'MISDEMEANOR' | 'INFRACTION';

export type OffenseType =
  | 'DRUG_POSSESSION'
  | 'DRUG_DISTRIBUTION'
  | 'VIOLENT'
  | 'SEX_OFFENSE'
  | 'PROPERTY_THEFT'
  | 'PROPERTY_BURGLARY'
  | 'FINANCIAL_FRAUD'
  | 'WEAPONS'
  | 'DUI'
  | 'OTHER';

export interface ConvictionDto {
  category: ConvictionCategory;
  offenseType: OffenseType;
  convictionYear?: number;
  releaseYear?: number;
  currentlyIncarcerated?: boolean;
  onParole?: boolean;
  onProbation?: boolean;
  supervisionEndDate?: string;
  sexOffenderRegistry?: boolean;
  notes?: string;
}

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'TEMP'
  | 'INTERNSHIP'
  | 'OTHER';

export interface JobDto {
  id: string;
  title: string;
  company: string;
  description: string;
  descriptionHtml: string | null;
  applyUrl: string;
  locationCity: string | null;
  locationRegion: string | null;
  locationPostalCode: string | null;
  locationCountry: string | null;
  remote: boolean;
  employmentType: EmploymentType;
  industry: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  requiredSkills: string[];
  requiredCertifications: string[];
  minYearsExperience: number | null;
  riskTier: RiskTier;
  backgroundCheckLikely: boolean;
  excludesFelons: boolean;
  isApprenticeship: boolean;
  postedAt: string | null;
  expiresAt: string | null;
  sourceCode?: string;
  sourceName?: string;
}

export interface ScoreBreakdownDto {
  industry: number;
  skills: number;
  certifications: number;
  experience: number;
  location: number;
  risk: number;
}

export type PublicJobSummaryDto = Pick<
  JobDto,
  | 'id'
  | 'title'
  | 'company'
  | 'locationCity'
  | 'locationRegion'
  | 'industry'
  | 'riskTier'
  | 'backgroundCheckLikely'
  | 'excludesFelons'
  | 'applyUrl'
  | 'postedAt'
>;

export interface ScoredJobDto {
  jobId: string;
  score: number; // 0..100
  breakdown: ScoreBreakdownDto;
  explanation: string;
  job: PublicJobSummaryDto;
}

export interface AvoidJobDto {
  jobId: string;
  reasons: string[];
  score: number;
  job: PublicJobSummaryDto;
}

export interface MatchesResponseDto {
  userId: string;
  counts: { top: number; medium: number; avoid: number; pool: number };
  topMatches: ScoredJobDto[];
  mediumMatches: ScoredJobDto[];
  avoid: AvoidJobDto[];
}

/** @deprecated — use ScoredJobDto. Kept for any Phase-1 callers still wired up. */
export type MatchDto = ScoredJobDto;

export interface InsightItemDto {
  kind: 'certification' | 'skill';
  code: string;
  label: string;
  unlocks: number;
  promotesToTop: number;
  demand: number;
}

export interface InsightsResponseDto {
  userId: string;
  currentTop: number;
  currentMedium: number;
  items: InsightItemDto[];
}

export interface StatsBucketDto { key: string; label: string; count: number }
export interface StatsSalaryBandDto { label: string; count: number; min: number | null; max: number | null }

export interface JobsStatsDto {
  totals: {
    active: number;
    fairChanceFriendly: number;
    remote: number;
    apprenticeships: number;
    withSalary: number;
    postedLast7Days: number;
    postedLast30Days: number;
  };
  byIndustry: StatsBucketDto[];
  byRegion: StatsBucketDto[];
  bySource: StatsBucketDto[];
  byRiskTier: StatsBucketDto[];
  salaryBands: StatsSalaryBandDto[];
  topCertifications: StatsBucketDto[];
  topSkills: StatsBucketDto[];
}

export interface PaginatedJobsDto {
  total: number;
  limit: number;
  offset: number;
  results: JobDto[];
}
