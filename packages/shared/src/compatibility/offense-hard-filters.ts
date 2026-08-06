/**
 * Offense × duty HARD filters — the categorical, legal-bar layer.
 *
 * This is intentionally NARROWER than the nuanced `scoreJobCompatibility`
 * engine. The compatibility engine produces a graded 0–100 chance for
 * *every* job; this module answers a different, blunter question:
 *
 *   "Is there a categorical legal / licensing bar that makes this
 *    conviction × this role a non-starter, regardless of the candidate's
 *    strengths?"
 *
 * It exists as a single source of truth so three consumers stay in sync:
 *   1. The NestJS API RuleScorer hard filters (apps/api/.../rule.scorer.ts)
 *   2. The NestJS API browse-by-offense Prisma filter (offense-filters.ts)
 *   3. The deployed web app's in-app backend (apps/web/lib/server-data.ts)
 *
 * Previously (1) and (2) carried their own copy that only covered 4 of the
 * 10 conviction types, and (3) had no offense filtering at all — so the
 * `offenseType` query param was silently ignored. Centralising here closes
 * that gap and removes the divergence.
 *
 * Wording rules mirror explanations.ts: dignity-centered, never absolute,
 * always pointing toward caseworker review rather than a flat rejection.
 */
import { ConvictionType } from './types';

export interface OffenseHardFilter {
  /** Industries where this conviction is a categorical bar. */
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
 * One entry per conviction type. Empty industry/keyword sets mean "no
 * categorical bar" — the graded engine still applies, but nothing is
 * hard-blocked. `other` is always permissive.
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
      'Registry-related status may legally bar roles involving minors, schools, or vulnerable-population settings. Caseworker review of jurisdictional restrictions recommended.',
  },
  violent_offense: {
    blocksIndustry: new Set(['childcare', 'schools']),
    blocksTitleKeyword: [
      'childcare', 'daycare', 'school', 'minor', 'pediatric', 'youth',
      'caregiver', 'home health', 'patient care', 'security guard', 'armed',
    ],
    reason:
      'A violence-related conviction can bar roles with unsupervised access to children or vulnerable adults, and most armed-security positions. Individualized assessment recommended.',
  },
  drug_distribution: {
    blocksIndustry: NONE,
    blocksTitleKeyword: [
      'pharmacy', 'pharmacist', 'pharmacy tech', 'medication', 'controlled substance',
      'dispensary', 'cannabis',
    ],
    reason:
      'A drug-distribution conviction commonly bars roles handling controlled substances or medication (pharmacy, dispensing). Other roles remain open.',
  },
  drug_possession: {
    blocksIndustry: NONE,
    blocksTitleKeyword: ['pharmacy', 'pharmacist', 'pharmacy tech', 'controlled substance'],
    reason:
      'A drug-possession conviction may restrict roles directly handling controlled substances. Most other roles are unaffected.',
  },
  financial_fraud: {
    blocksIndustry: new Set(['finance', 'insurance']),
    blocksTitleKeyword: [
      'teller', 'accountant', 'bookkeeper', 'cashier', 'cash handling', 'payroll',
      'financial', 'controller', 'treasurer', 'auditor',
    ],
    reason:
      'A financial-fraud conviction typically disqualifies cash-handling, finance, and fiduciary roles. Roles without money-handling duties remain viable.',
  },
  property_theft: {
    blocksIndustry: NONE,
    blocksTitleKeyword: ['cashier', 'teller', 'cash handling'],
    reason:
      'A property/theft conviction can restrict cash-handling roles. Many warehouse, trades, and labor roles remain a strong fit.',
  },
  burglary: {
    blocksIndustry: NONE,
    blocksTitleKeyword: ['in-home', 'in home', 'home services', 'locksmith', 'residential'],
    reason:
      'A burglary conviction can bar roles with unsupervised access to private residences (in-home services, locksmithing). Most other roles remain open.',
  },
  weapons_related: {
    blocksIndustry: new Set(['security']),
    blocksTitleKeyword: ['armed', 'firearm', 'security guard', 'armed guard'],
    reason:
      'A weapons-related conviction bars security and other roles requiring firearms eligibility. Unarmed roles remain viable.',
  },
  dui_dwi: {
    blocksIndustry: NONE,
    blocksTitleKeyword: ['driver', 'cdl', 'delivery', 'chauffeur', 'trucking', 'truck driver'],
    reason:
      'A recent DUI/DWI conviction disqualifies most commercial driving roles under DOT regulation. Non-driving roles are unaffected.',
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

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole-word title match. Using `includes()` here would mis-fire on
 * substrings — e.g. the keyword "elder" inside "welder", or "minor" inside
 * "minority" — so we anchor on word boundaries instead. Multi-word and
 * hyphenated keywords ("home health", "in-home", "cdl-a") still match.
 */
function titleMatchesKeyword(title: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(title);
}

/**
 * Is there a categorical legal/licensing bar for this conviction × job?
 * Returns the reason when blocked, or `{ blocked: false, reason: null }`.
 */
export function isOffenseHardBlocked(
  conviction: ConvictionType | null | undefined,
  job: { industry?: string | null; title?: string | null },
): { blocked: boolean; reason: string | null } {
  if (!conviction) return { blocked: false, reason: null };
  const rule = OFFENSE_HARD_FILTERS[conviction];
  if (!rule) return { blocked: false, reason: null };

  const industry = norm(job.industry);
  const title = norm(job.title);

  const industryHit = industry !== '' && rule.blocksIndustry.has(industry);
  const titleHit = rule.blocksTitleKeyword.some((k) => titleMatchesKeyword(title, k));

  return industryHit || titleHit
    ? { blocked: true, reason: rule.reason }
    : { blocked: false, reason: null };
}
