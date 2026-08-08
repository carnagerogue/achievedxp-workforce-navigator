/**
 * Conviction-aware job compatibility engine — public types.
 *
 * Goal: given (a) a candidate's specific conviction history and profile and
 * (b) a job's full text + metadata, return a deterministic 0–100 score with
 * a complete audit trail explaining why. Used on the Browse Jobs page to
 * dynamically re-rank jobs when the user picks a conviction type.
 *
 * Distinct from the personalization scorer at apps/api/src/scoring — that
 * one answers "is this user a good fit for this job in general?" while
 * this engine answers "given this conviction, what is the realistic chance
 * for this specific role?"
 *
 * Everything here is pure TypeScript; no runtime deps. Designed to run
 * client-side so that filter changes re-rank instantly.
 */

// ════════════════════════════════════════════════════════════════════
// CONVICTION TYPE — internal enum + display labels
// ════════════════════════════════════════════════════════════════════

/**
 * Internal enum values stored in the user profile and passed through the
 * scoring engine. NEVER use stigmatizing terms here — `registry_related`
 * stands in for the legal classification without naming it directly.
 */
export type ConvictionType =
  | 'drug_possession'
  | 'drug_distribution'
  | 'violent_offense'
  | 'registry_related'
  | 'property_theft'
  | 'burglary'
  | 'financial_fraud'
  | 'weapons_related'
  | 'dui_dwi'
  | 'other';

/**
 * User-facing labels. Every UI dropdown / display surface MUST use these,
 * not the enum values directly.
 */
export const CONVICTION_LABELS: Record<ConvictionType, string> = {
  drug_possession: 'Drug possession-related conviction',
  drug_distribution: 'Drug distribution-related conviction',
  violent_offense: 'Violence-related conviction',
  registry_related: 'Registry-related conviction',
  property_theft: 'Property or theft-related conviction',
  burglary: 'Burglary-related conviction',
  financial_fraud: 'Financial fraud-related conviction',
  weapons_related: 'Weapons-related conviction',
  dui_dwi: 'DUI/DWI-related conviction',
  other: 'Other conviction',
};

/** Stable order for the dropdown — most common first, "other" last. */
export const CONVICTION_TYPE_ORDER: ConvictionType[] = [
  'drug_possession',
  'drug_distribution',
  'violent_offense',
  'property_theft',
  'burglary',
  'financial_fraud',
  'weapons_related',
  'dui_dwi',
  'registry_related',
  'other',
];

// ════════════════════════════════════════════════════════════════════
// CANDIDATE PROFILE — what the engine reads about the person
// ════════════════════════════════════════════════════════════════════

export type SupervisionStatus =
  | 'none'
  | 'parole'
  | 'probation'
  | 'parole_and_probation'
  | 'pretrial'
  | 'incarcerated';

export type EducationLevel =
  | 'less_than_high_school'
  | 'high_school_or_ged'
  | 'some_college'
  | 'associate'
  | 'bachelor'
  | 'graduate'
  | 'unknown';

/**
 * The bundle of candidate facts the scorer needs. All fields optional so
 * the engine degrades gracefully when the profile is incomplete.
 */
export interface CandidateProfile {
  convictionType?: ConvictionType;
  /** Broad court classification. Required for rules that apply only to felonies. */
  convictionCategory?: 'FELONY' | 'MISDEMEANOR' | 'INFRACTION';
  /** Exact charge/statute as shown on court paperwork, when the person knows it. */
  exactOffense?: string | null;
  /** State/territory code where the conviction occurred. */
  convictionJurisdiction?: string | null;
  /** ISO yyyy-mm-dd or just yyyy. */
  convictionDate?: string | number | null;
  /** ISO yyyy-mm-dd or just yyyy. Preferred over convictionDate when present. */
  releaseDate?: string | number | null;
  supervisionStatus?: SupervisionStatus;
  expungedOrSealed?: boolean;
  /** A legally effective restoration applicable to firearm possession. */
  firearmRightsRestored?: boolean;
  /** Known current HHS-OIG exclusion; never inferred solely from offense category. */
  currentlyExcludedFromFederalHealthcare?: boolean;
  hasPendingCharges?: boolean;
  certifications?: string[];
  workExperienceIndustries?: string[];
  educationLevel?: EducationLevel;
  willingToRelocate?: boolean;
  transportationAccess?: boolean;
  desiredIndustries?: string[];
  excludedIndustries?: string[];
}

// ════════════════════════════════════════════════════════════════════
// JOB INPUT — what the engine reads about the job
// ════════════════════════════════════════════════════════════════════

/**
 * Minimal job shape the engine needs. Designed to map cleanly to our
 * existing Prisma `Job` rows without an explicit conversion step.
 */
export interface JobInput {
  id: string;
  title: string;
  company?: string | null;
  description?: string | null;
  industry?: string | null;
  /** Pre-computed by classifier; treated as a hint, not authoritative. */
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  /** Pre-computed by classifier; the engine still re-checks the description. */
  excludesFelons?: boolean | null;
  backgroundCheckLikely?: boolean | null;
  remote?: boolean | null;
  locationRegion?: string | null;
  locationCity?: string | null;
  isApprenticeship?: boolean | null;
  requiredSkills?: string[];
  requiredCertifications?: string[];
}

// ════════════════════════════════════════════════════════════════════
// SCORE COMPONENTS + AUDIT
// ════════════════════════════════════════════════════════════════════

export interface ScoreComponent {
  /** 0..1 normalized score for this dimension. */
  rawScore: number;
  /** rawScore × maxWeight, contributes directly to the 0–100 total. */
  weightedScore: number;
  /** Maximum weight this component can contribute. */
  maxWeight: number;
  /** Short human label for the dimension. */
  label: string;
  /** One-sentence explanation of why this component scored as it did. */
  explanation: string;
  /** Specific signals that fed into this component (matched phrases, table hits). */
  signals: string[];
}

export interface AuditItem {
  /** Stable rule identifier — useful for filtering / regression testing. */
  ruleId: string;
  /** Net signed impact this rule had on the final 0–100 score. */
  impact: number;
  /** Human-readable reason — designed to be auditable by a caseworker. */
  reason: string;
  /** Excerpt from the source text that triggered the rule, if applicable. */
  matchedText?: string;
}

/** Component weights — sum to 100. Tunable via tests in scoring.test.ts. */
export const SCORE_WEIGHTS = {
  convictionToDutyRelevance: 30,
  hardBarrierSignals: 25,
  employerFairChancePosture: 15,
  industrySensitivity: 10,
  timeSinceConvictionOrRelease: 10,
  candidateStrengthOffset: 5,
  locationProtections: 5,
} as const;

export type ScoreComponentKey = keyof typeof SCORE_WEIGHTS;

// ════════════════════════════════════════════════════════════════════
// FINAL OUTPUT
// ════════════════════════════════════════════════════════════════════

export type ChanceLevel = 'high' | 'medium' | 'low';
export type CompatibilityLabel = 'Strong Match' | 'Possible Match' | 'Challenging Match';
export type RiskLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface CompatibilityRating {
  /** 0–100 overall compatibility. */
  score: number;
  chance: ChanceLevel;
  label: CompatibilityLabel;
  /** Coarse risk band — useful for sort/group, distinct from chance. */
  riskLevel: RiskLevel;
  /** One-sentence summary suitable for a job-card subtitle. */
  summary: string;
  scoreBreakdown: Record<ScoreComponentKey, ScoreComponent>;
  /** Negative factors the user should know about. */
  riskFactors: string[];
  /** Positive factors that improved the score. */
  positiveFactors: string[];
  /** Specific things that could block this application (legal, licensure, employer policy). */
  possibleBarriers: string[];
  /** Concrete actions the candidate can take to raise their chance. */
  chanceImprovers: string[];
  /** What the candidate should do next — varies by chance level. */
  recommendedNextStep: string;
  /** Notes a caseworker / auditor should review before the candidate applies. */
  caseworkerNotes: string[];
  /** Full deterministic rule trail — every rule that fired, with its impact. */
  auditTrail: AuditItem[];
  /** Evidence-backed federal/state/employer eligibility screening. */
  eligibility: import('./regulated-eligibility').EligibilityAssessment;
}

// ════════════════════════════════════════════════════════════════════
// THRESHOLDS
// ════════════════════════════════════════════════════════════════════

export const CHANCE_THRESHOLDS = {
  high: 75,    // ≥ 75 → high / Strong Match
  medium: 45,  // 45–74 → medium / Possible Match; <45 → low / Challenging Match
} as const;

export function chanceFromScore(score: number): ChanceLevel {
  if (score >= CHANCE_THRESHOLDS.high) return 'high';
  if (score >= CHANCE_THRESHOLDS.medium) return 'medium';
  return 'low';
}

export function labelFromChance(chance: ChanceLevel): CompatibilityLabel {
  if (chance === 'high') return 'Strong Match';
  if (chance === 'medium') return 'Possible Match';
  return 'Challenging Match';
}

/**
 * Resolve a year/iso string to a Date, or null if unparseable. Accepts
 * numeric years (2019), full ISO strings, or yyyy-mm-dd.
 */
export function parseAsDate(input: string | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') {
    if (input < 1900 || input > 2100) return null;
    return new Date(Date.UTC(input, 0, 1));
  }
  // 4-digit year
  if (/^\d{4}$/.test(input)) {
    return new Date(Date.UTC(Number(input), 0, 1));
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}
