/**
 * Legacy offense × duty concern catalog plus the compatibility hard-check API.
 *
 * The exported catalog remains for API compatibility. The public hard-check
 * function no longer interprets broad industry buckets as law; it delegates
 * to the sourced, fact-sensitive regulated-eligibility engine below.
 */
import type { CandidateProfile, ConvictionType, JobInput } from './types';
import { assessRegulatedEligibility } from './regulated-eligibility';

export interface OffenseHardFilter {
  /** @deprecated Broad duty-concern industries; not a legal-bar list. */
  blocksIndustry: ReadonlySet<string>;
  /**
   * Substrings in the job *title* that trip the filter (case-insensitive).
   * Used for roles whose industry classification is too coarse to catch
   * them (e.g. a "teller" tagged `services` should still bar for fraud).
   */
  blocksTitleKeyword: ReadonlyArray<string>;
  /** Human-readable, dignity-centered reason shown on the Avoid card. */
  reason: string;
}

const NONE = new Set<string>();

/**
 * One legacy entry per conviction type. These keywords support compatibility
 * explanations only and must not be used as categorical legal conclusions.
 */
export const OFFENSE_HARD_FILTERS: Record<ConvictionType, OffenseHardFilter> = {
  registry_related: {
    blocksIndustry: new Set(['education', 'healthcare', 'childcare', 'schools']),
    blocksTitleKeyword: [
      'school', 'daycare', 'childcare', 'minor', 'pediatric', 'caregiver',
      'youth', 'teacher', 'tutor', 'paraeducator', 'nanny', 'coach', 'camp',
      'home health', 'in-home', 'elder',
    ],
    reason:
      'Registry status can trigger specific child-care and state restrictions. Confirm the provider, duties, exact state rule, and any review process.',
  },
  violent_offense: {
    blocksIndustry: new Set(['childcare', 'schools']),
    blocksTitleKeyword: [
      'childcare', 'daycare', 'school', 'minor', 'pediatric', 'youth',
      'caregiver', 'home health', 'patient care', 'security guard', 'armed',
    ],
    reason:
      'Access to children or vulnerable adults requires exact offense and jurisdiction review; armed duties separately require firearm eligibility.',
  },
  drug_distribution: {
    blocksIndustry: NONE,
    blocksTitleKeyword: [
      'pharmacy', 'pharmacist', 'pharmacy tech', 'medication', 'controlled substance',
      'dispensary', 'cannabis',
    ],
    reason:
      'Medication and controlled-substance duties require exact healthcare exclusion, license, and facility-rule verification.',
  },
  drug_possession: {
    blocksIndustry: NONE,
    blocksTitleKeyword: ['pharmacy', 'pharmacist', 'pharmacy tech', 'controlled substance'],
    reason:
      'Controlled-substance duties may require state licensing review; a broad possession category is not a universal occupational ban.',
  },
  financial_fraud: {
    blocksIndustry: new Set(['finance', 'insurance']),
    blocksTitleKeyword: [
      'teller', 'accountant', 'bookkeeper', 'cashier', 'cash handling', 'payroll',
      'financial', 'controller', 'treasurer', 'auditor',
    ],
    reason:
      'Financial duties create direct relevance; banking, securities, insurance, and employer rules each have distinct time limits and approval paths.',
  },
  property_theft: {
    blocksIndustry: NONE,
    blocksTitleKeyword: ['cashier', 'teller', 'cash handling'],
    reason:
      'Cash and property access create a duty-relevance concern that should be assessed using the exact offense, time elapsed, and safeguards.',
  },
  burglary: {
    blocksIndustry: NONE,
    blocksTitleKeyword: ['in-home', 'in home', 'home services', 'locksmith', 'residential'],
    reason:
      'Unsupervised residential access creates a direct duty-relevance concern and calls for individualized review.',
  },
  weapons_related: {
    blocksIndustry: new Set(['security']),
    blocksTitleKeyword: ['armed', 'firearm', 'security guard', 'armed guard'],
    reason:
      'Firearm duties require federal and state possession eligibility; unarmed roles require separate license and employer review.',
  },
  dui_dwi: {
    blocksIndustry: NONE,
    blocksTitleKeyword: ['driver', 'cdl', 'delivery', 'chauffeur', 'trucking', 'truck driver'],
    reason:
      'Commercial-driving eligibility depends on the incident count, date, vehicle type, hazmat status, current license, and reinstatement.',
  },
  other: {
    blocksIndustry: NONE,
    blocksTitleKeyword: [],
    reason: '',
  },
};

/**
 * Canonical map from the stored uppercase `OffenseType` enum (Prisma /
 * DTO) to the lowercase `ConvictionType` the compatibility engine speaks.
 * The legacy `SEX_OFFENSE` value is mapped to `registry_related` for
 * backward compatibility with rows written before the rename.
 */
export const OFFENSE_TYPE_TO_CONVICTION: Record<string, ConvictionType> = {
  DRUG_POSSESSION: 'drug_possession',
  DRUG_DISTRIBUTION: 'drug_distribution',
  VIOLENT: 'violent_offense',
  REGISTRY_RELATED: 'registry_related',
  SEX_OFFENSE: 'registry_related',
  PROPERTY_THEFT: 'property_theft',
  PROPERTY_BURGLARY: 'burglary',
  FINANCIAL_FRAUD: 'financial_fraud',
  WEAPONS: 'weapons_related',
  DUI: 'dui_dwi',
  OTHER: 'other',
};

/** Map a stored OffenseType (or anything) to a ConvictionType, defaulting to `other`. */
export function convictionForOffenseType(t: string | null | undefined): ConvictionType {
  if (!t) return 'other';
  return OFFENSE_TYPE_TO_CONVICTION[t] ?? 'other';
}

/**
 * Backward-compatible categorical check. It now delegates to the researched
 * eligibility engine and returns true only for a likely statutory/regulatory
 * disqualification—not for a background check, broad industry concern,
 * employer preference, state review, or a waiver/consent process.
 */
export function isOffenseHardBlocked(
  conviction: ConvictionType | CandidateProfile | null | undefined,
  job: { industry?: string | null; title?: string | null; company?: string | null; description?: string | null; locationRegion?: string | null },
): { blocked: boolean; reason: string | null } {
  if (!conviction) return { blocked: false, reason: null };
  const candidate: CandidateProfile = typeof conviction === 'string'
    ? { convictionType: conviction }
    : conviction;
  const input: JobInput = {
    id: 'eligibility-check',
    title: job.title ?? '',
    company: job.company,
    description: job.description,
    industry: job.industry,
    locationRegion: job.locationRegion,
  };
  const assessment = assessRegulatedEligibility(candidate, input);
  const hit = assessment.findings.find((item) => item.status === 'likely_disqualified');
  return hit ? { blocked: true, reason: `${hit.title}: ${hit.explanation}` } : { blocked: false, reason: null };
}
