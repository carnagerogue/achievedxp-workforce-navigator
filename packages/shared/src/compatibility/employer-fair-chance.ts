/**
 * Employer Fair-Chance Memory — aggregates per-employer signals across
 * jobs and (optionally) reported outcomes to produce a confidence score
 * for how likely the employer is to consider justice-impacted candidates.
 *
 * Deterministic, additive scoring. Never overstates certainty: when the
 * underlying counts are small, the level returns 'unknown' even if the
 * raw computation favors one direction.
 *
 * Designed to be plugged into the API (one row per employer name) and
 * displayed on job cards / drawers without leaking unverified claims.
 */

export type FairChanceConfidence = 'high' | 'moderate' | 'unknown' | 'low';

export interface EmployerJobsCounts {
  totalJobs: number;
  fairChanceLanguageJobs: number;
  cleanRecordLanguageJobs: number;
  backgroundCheckJobs: number;
  /** Jobs with HIGH risk-tier (federal-suitability override included). */
  highRiskJobs: number;
}

export interface EmployerOutcomeCounts {
  applications: number;
  interviews: number;
  offers: number;
  /** Reported denials specifically attributed to background reasons. */
  backgroundDenials: number;
}

export interface EmployerFairChanceProfile {
  employerName: string;
  industries: string[];
  jobs: EmployerJobsCounts;
  outcomes: EmployerOutcomeCounts;
  confidence: FairChanceConfidence;
  /** 0..100 internal score behind the confidence band. */
  rawScore: number;
  /** Plain-English rationale shown alongside the chip. */
  reason: string;
}

/**
 * Minimum number of *signals* required (jobs OR outcomes) before we'll
 * commit to a non-'unknown' confidence. Below this threshold the answer
 * is honestly "we don't know yet."
 */
const MIN_SIGNALS_FOR_CONFIDENCE = 3;

export interface ComputeInput {
  employerName: string;
  industries?: string[];
  jobs?: Partial<EmployerJobsCounts>;
  outcomes?: Partial<EmployerOutcomeCounts>;
}

/**
 * Compute the employer's fair-chance confidence. Pure function over the
 * aggregate counts so the result is reproducible from raw data.
 */
export function computeEmployerFairChance(input: ComputeInput): EmployerFairChanceProfile {
  const jobs: EmployerJobsCounts = {
    totalJobs: input.jobs?.totalJobs ?? 0,
    fairChanceLanguageJobs: input.jobs?.fairChanceLanguageJobs ?? 0,
    cleanRecordLanguageJobs: input.jobs?.cleanRecordLanguageJobs ?? 0,
    backgroundCheckJobs: input.jobs?.backgroundCheckJobs ?? 0,
    highRiskJobs: input.jobs?.highRiskJobs ?? 0,
  };
  const outcomes: EmployerOutcomeCounts = {
    applications: input.outcomes?.applications ?? 0,
    interviews: input.outcomes?.interviews ?? 0,
    offers: input.outcomes?.offers ?? 0,
    backgroundDenials: input.outcomes?.backgroundDenials ?? 0,
  };

  // Build the additive score. Each signal contributes a fixed delta;
  // total is normalized to a 0..100 range with 50 = neutral.
  let raw = 50;

  // ─── Job-language signals ───
  if (jobs.totalJobs > 0) {
    const fairRatio = jobs.fairChanceLanguageJobs / jobs.totalJobs;
    const cleanRatio = jobs.cleanRecordLanguageJobs / jobs.totalJobs;
    const highRiskRatio = jobs.highRiskJobs / jobs.totalJobs;

    raw += fairRatio * 30;        // up to +30 if every posting is fair-chance-explicit
    raw -= cleanRatio * 35;        // up to -35 if every posting is clean-record-required
    raw -= highRiskRatio * 15;     // federal-suitability employers tilt down
  }

  // ─── Outcome signals (heavier weight; real evidence) ───
  if (outcomes.applications >= 5) {
    const offerRatio = outcomes.offers / Math.max(1, outcomes.applications);
    const interviewRatio = outcomes.interviews / Math.max(1, outcomes.applications);
    const denialRatio = outcomes.backgroundDenials / Math.max(1, outcomes.applications);

    raw += interviewRatio * 15;
    raw += offerRatio * 25;
    raw -= denialRatio * 30;
  }

  raw = Math.max(0, Math.min(100, Math.round(raw)));

  // Decide confidence band — including the "not enough data" gate.
  const totalSignals =
    jobs.totalJobs +
    outcomes.applications +
    outcomes.interviews +
    outcomes.offers +
    outcomes.backgroundDenials;

  let confidence: FairChanceConfidence;
  if (totalSignals < MIN_SIGNALS_FOR_CONFIDENCE) {
    confidence = 'unknown';
  } else if (raw >= 70) confidence = 'high';
  else if (raw >= 50) confidence = 'moderate';
  else confidence = 'low';

  return {
    employerName: input.employerName,
    industries: input.industries ?? [],
    jobs,
    outcomes,
    confidence,
    rawScore: raw,
    reason: buildReason({ jobs, outcomes, confidence, totalSignals, raw }),
  };
}

function buildReason(args: {
  jobs: EmployerJobsCounts;
  outcomes: EmployerOutcomeCounts;
  confidence: FairChanceConfidence;
  totalSignals: number;
  raw: number;
}): string {
  const { jobs, outcomes, confidence, totalSignals, raw } = args;
  if (confidence === 'unknown') {
    return `Not enough data yet (${totalSignals} signal${totalSignals === 1 ? '' : 's'}). We will not estimate fair-chance posture without more evidence.`;
  }

  const parts: string[] = [];
  if (jobs.totalJobs > 0) {
    if (jobs.fairChanceLanguageJobs > 0) parts.push(`${jobs.fairChanceLanguageJobs} of ${jobs.totalJobs} postings include fair-chance language`);
    if (jobs.cleanRecordLanguageJobs > 0) parts.push(`${jobs.cleanRecordLanguageJobs} include clean-record language`);
    if (jobs.highRiskJobs > 0) parts.push(`${jobs.highRiskJobs} are high-scrutiny roles`);
  }
  if (outcomes.applications >= 5) {
    parts.push(`${outcomes.offers} offer(s) across ${outcomes.applications} reported application(s)`);
    if (outcomes.backgroundDenials > 0) parts.push(`${outcomes.backgroundDenials} background-related denial(s)`);
  }
  return `Score ${raw}/100 · ${parts.join(', ') || 'aggregated from posting language only.'}`;
}

// ────────────────────────────────────────────────────────────────────
// UI helpers
// ────────────────────────────────────────────────────────────────────

export function confidenceLabel(c: FairChanceConfidence): string {
  if (c === 'high')      return 'High';
  if (c === 'moderate')  return 'Moderate';
  if (c === 'low')       return 'Low';
  return 'Unknown';
}

export function confidenceTone(c: FairChanceConfidence): 'emerald' | 'amber' | 'rose' | 'slate' {
  if (c === 'high')      return 'emerald';
  if (c === 'moderate')  return 'amber';
  if (c === 'low')       return 'rose';
  return 'slate';
}
