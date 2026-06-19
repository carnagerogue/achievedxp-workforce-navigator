/**
 * Provider-layer classification — thin adapter over the shared classification
 * engine (`@dxp/shared` → classifyJob). The engine separates source facts from
 * inferred labels, attaches confidence, strictly gates apprenticeships, and
 * never marks a clearance/security-sensitive role fair-chance. This file maps
 * its output onto JobDto fields and normalizes the location at ingestion.
 */
import {
  classifyJob, normalizeLocation, isApprenticeshipType,
  type JobDto, type RiskTier,
} from '@dxp/shared';

const REMOTE_PATTERNS = /\b(remote|work from home|wfh|fully remote|virtual position)\b/i;

export interface ClassifyInput {
  title: string;
  description: string;
  company: string;
  industryHint?: string | null;
}

export interface ClassifyOutput {
  industry: string | null;
  riskTier: RiskTier;
  backgroundCheckLikely: boolean;
  excludesFelons: boolean;
  isApprenticeship: boolean;
  remote: boolean;
}

export function classify(input: ClassifyInput): ClassifyOutput {
  const meta = classifyJob({
    title: input.title, description: input.description, company: input.company,
    industryHint: input.industryHint ?? null,
  });
  return {
    industry: meta.industry.value,
    riskTier: meta.riskTier.value,
    backgroundCheckLikely: meta.backgroundCheckLikely.value,
    excludesFelons: meta.excludesFelons.value,
    isApprenticeship: isApprenticeshipType(meta.apprenticeship.value),
    remote: REMOTE_PATTERNS.test(`${input.title} ${input.description}`),
  };
}

/**
 * Apply classification + location normalization to a partially-built JobDto.
 * Attaches the full classification meta (provenance + confidence) so downstream
 * UI can show evidence and suppress uncertain labels.
 */
export function applyClassification(
  job: Omit<JobDto, 'industry' | 'riskTier' | 'excludesFelons' | 'backgroundCheckLikely' | 'isApprenticeship' | 'remote' | 'classification'> & {
    industry?: string | null;
    remote?: boolean;
  },
): JobDto {
  const meta = classifyJob({
    title: job.title, description: job.description, company: job.company,
    industryHint: job.industry ?? null,
  });
  const { city, region } = normalizeLocation(job.locationCity, job.locationRegion, job.locationCountry);
  return {
    ...job,
    locationCity: city,
    locationRegion: region,
    industry: meta.industry.value,
    riskTier: meta.riskTier.value,
    excludesFelons: meta.excludesFelons.value,
    backgroundCheckLikely: meta.backgroundCheckLikely.value,
    isApprenticeship: isApprenticeshipType(meta.apprenticeship.value),
    remote: Boolean(job.remote) || REMOTE_PATTERNS.test(`${job.title} ${job.description}`),
    classification: meta,
  };
}
