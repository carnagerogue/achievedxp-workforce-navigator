/**
 * Conviction-aware compatibility scoring engine.
 *
 * Pure function: same inputs always produce the same output. The score is
 * built up component-by-component, each contributing at most its declared
 * weight. The audit trail records every rule that fired and its impact so
 * a caseworker can reproduce the result by hand.
 *
 * Component weights (sum to 100):
 *   convictionToDutyRelevance     30
 *   hardBarrierSignals            25
 *   employerFairChancePosture     15
 *   industrySensitivity           10
 *   timeSinceConvictionOrRelease  10
 *   candidateStrengthOffset        5
 *   locationProtections            5
 */
import {
  AuditItem,
  CandidateProfile,
  CompatibilityRating,
  JobInput,
  ScoreComponent,
  SCORE_WEIGHTS,
  ScoreComponentKey,
  chanceFromScore,
  labelFromChance,
  parseAsDate,
  RiskLevel,
} from './types';
import {
  Signal,
  SignalsResult,
  classifyEmployerPosture,
  detectSignals,
  EmployerPosture,
} from './signals';
import {
  evaluateMatrix,
  concernLevelToContribution,
  MatrixMatch,
} from './risk-matrix';
import {
  getIndustrySensitivity,
  sensitivityToContribution,
} from './industry-sensitivity';
import {
  generateExplanations,
  recommendNextStep,
} from './explanations';

// ────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────

/** Round to nearest int and clamp to [0, 100]. */
function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function makeComponent(
  raw: number,
  maxWeight: number,
  label: string,
  explanation: string,
  signals: string[] = [],
): ScoreComponent {
  const clampedRaw = Math.max(0, Math.min(1, raw));
  return {
    rawScore: Number(clampedRaw.toFixed(3)),
    weightedScore: Math.round(clampedRaw * maxWeight),
    maxWeight,
    label,
    explanation,
    signals,
  };
}

// ────────────────────────────────────────────────────────────────────
// Component scorers
// ────────────────────────────────────────────────────────────────────

/** 1. Conviction × duty relevance — the matrix lookup. */
function scoreConvictionToDuty(
  candidate: CandidateProfile,
  job: JobInput,
  trail: AuditItem[],
): { component: ScoreComponent; worst: MatrixMatch; allMatches: MatrixMatch[]; matrixDescription: string } {
  const conviction = candidate.convictionType;
  const max = SCORE_WEIGHTS.convictionToDutyRelevance;

  if (!conviction) {
    trail.push({ ruleId: 'no_conviction_selected', impact: max, reason: 'No conviction type selected — duty-relevance neutral.' });
    return {
      component: makeComponent(1, max, 'Conviction-to-duty relevance', 'No conviction type selected; full points awarded.', []),
      worst: { level: 'low', ruleId: 'no_conviction_selected', reason: 'No conviction type selected.', matchedKeyword: '' },
      allMatches: [],
      matrixDescription: '',
    };
  }

  const { worst, all, matrixDescription } = evaluateMatrix(conviction, {
    industry: job.industry,
    title: job.title,
    company: job.company,
    description: job.description,
  });
  const raw = concernLevelToContribution(worst.level);
  const weighted = Math.round(raw * max);

  trail.push({
    ruleId: `matrix.${worst.ruleId}`,
    impact: weighted - max, // negative or zero
    reason: worst.reason,
    matchedText: worst.matchedKeyword || undefined,
  });

  const allSignals = all.map((m) => `${m.level}: ${m.reason}` + (m.matchedKeyword ? ` (matched: "${m.matchedKeyword}")` : ''));

  return {
    component: makeComponent(
      raw,
      max,
      'Conviction-to-duty relevance',
      worst.reason,
      allSignals,
    ),
    worst,
    allMatches: all,
    matrixDescription,
  };
}

/** 2. Hard-barrier signals — clean-record / clearance / fingerprint phrases. */
function scoreHardBarriers(
  signals: SignalsResult,
  trail: AuditItem[],
): ScoreComponent {
  const max = SCORE_WEIGHTS.hardBarrierSignals;
  const critical = signals.hardBarriers.filter((s) => s.severity === 'critical').length;
  const high = signals.hardBarriers.filter((s) => s.severity === 'high').length;
  const medium = signals.hardBarriers.filter((s) => s.severity === 'medium').length;
  const low = signals.hardBarriers.filter((s) => s.severity === 'low').length;

  // Each level pulls the score down toward zero.
  let raw = 1;
  raw -= critical * 0.6;
  raw -= high * 0.25;
  raw -= medium * 0.1;
  raw -= low * 0.04;
  raw = Math.max(0, raw);

  const messages: string[] = [];
  for (const s of signals.hardBarriers) {
    messages.push(`${s.severity}: ${s.message}`);
    trail.push({
      ruleId: `barrier.${s.id}`,
      impact: -Math.round(
        (s.severity === 'critical' ? 0.6 : s.severity === 'high' ? 0.25 : s.severity === 'medium' ? 0.1 : 0.04) *
          max,
      ),
      reason: s.message,
      matchedText: s.matchedText,
    });
  }

  const explanation = critical
    ? `Critical hard barrier(s) detected: ${signals.hardBarriers.filter((s) => s.severity === 'critical').map((s) => s.message).join(' ')}`
    : signals.hardBarriers.length === 0
      ? 'No hard-barrier language detected in the posting.'
      : `${signals.hardBarriers.length} potential barrier signal(s) detected.`;

  return makeComponent(raw, max, 'Hard-barrier signals', explanation, messages);
}

/** 3. Employer fair-chance posture. */
function scoreEmployerPosture(
  posture: EmployerPosture,
  signals: SignalsResult,
  trail: AuditItem[],
): ScoreComponent {
  const max = SCORE_WEIGHTS.employerFairChancePosture;
  const map: Record<EmployerPosture, number> = {
    positive: 1.0,
    neutral: 0.5,
    unknown: 0.5,
    strict: 0.2,
    very_strict: 0.0,
  };
  const raw = map[posture];
  const weighted = Math.round(raw * max);

  const positives = signals.fairChance.filter((s) => s.severity === 'positive');
  const minorPositives = signals.fairChance.filter((s) => s.severity === 'positive_minor');

  const messages: string[] = [
    ...positives.map((s) => `+ ${s.message}`),
    ...minorPositives.map((s) => `+ (minor) ${s.message}`),
  ];

  trail.push({
    ruleId: `posture.${posture}`,
    impact: weighted - Math.round(0.5 * max),
    reason: `Employer posture classified as "${posture.replace('_', ' ')}".`,
  });

  const explanation = posture === 'positive'
    ? 'Posting includes explicit fair-chance / second-chance language.'
    : posture === 'very_strict'
      ? 'Posting language signals the employer will not consider applicants with criminal history.'
      : posture === 'strict'
        ? 'Posting language signals strict background requirements.'
        : posture === 'unknown'
          ? 'Posting is too short or generic to classify employer posture.'
          : 'Posting is neutral on background-check policy.';

  return makeComponent(raw, max, 'Employer fair-chance posture', explanation, messages);
}

/** 4. Industry sensitivity. */
function scoreIndustrySensitivity(
  job: JobInput,
  trail: AuditItem[],
): ScoreComponent {
  const max = SCORE_WEIGHTS.industrySensitivity;
  const level = getIndustrySensitivity(job.industry);
  const raw = sensitivityToContribution(level);
  const weighted = Math.round(raw * max);

  trail.push({
    ruleId: `industry.${job.industry ?? 'unknown'}`,
    impact: weighted - max,
    reason: `Industry "${job.industry ?? 'unknown'}" sensitivity = ${level}.`,
  });

  const text = level >= 4
    ? `Industry "${job.industry}" has very high regulatory scrutiny.`
    : level >= 3
      ? `Industry "${job.industry}" has elevated regulatory scrutiny.`
      : level <= 1
        ? `Industry "${job.industry ?? 'unspecified'}" has minimal scrutiny.`
        : `Industry "${job.industry ?? 'unspecified'}" carries moderate scrutiny.`;

  return makeComponent(raw, max, 'Industry sensitivity', text, [`level=${level}`]);
}

/** 5. Time since conviction / release. */
function scoreTimeSince(
  candidate: CandidateProfile,
  trail: AuditItem[],
): ScoreComponent {
  const max = SCORE_WEIGHTS.timeSinceConvictionOrRelease;
  // Prefer release date if present.
  const reference = parseAsDate(candidate.releaseDate ?? null) ?? parseAsDate(candidate.convictionDate ?? null);
  let raw = 0.6; // neutral default when we don't know
  let explanation = 'No conviction or release date provided; neutral score applied.';
  let signals: string[] = [];

  if (reference) {
    const yearsAgo = (Date.now() - reference.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (yearsAgo < 1)        { raw = 0.2; explanation = 'Less than 1 year since conviction/release — recency lowers the score.'; }
    else if (yearsAgo < 3)   { raw = 0.4; explanation = '1–3 years since conviction/release — moderate negative impact.'; }
    else if (yearsAgo < 7)   { raw = 0.7; explanation = '3–7 years since conviction/release — minor negative impact.'; }
    else                     { raw = 1.0; explanation = '7+ years since conviction/release — recency is no longer a concern.'; }
    signals.push(`yearsAgo=${yearsAgo.toFixed(1)}`);
  }

  // Expungement / sealing — significant positive adjustment, capped at 1.
  if (candidate.expungedOrSealed) {
    raw = Math.min(1, raw + 0.25);
    signals.push('expunged_or_sealed');
    trail.push({ ruleId: 'time.expunged_or_sealed', impact: Math.round(0.25 * max), reason: 'Conviction is expunged or sealed; score adjusted positively.' });
    explanation += ' Expunged/sealed status applied.';
  }

  // Pending charges — pull score down regardless of recency.
  if (candidate.hasPendingCharges) {
    raw = Math.max(0, raw - 0.25);
    signals.push('pending_charges');
    trail.push({ ruleId: 'time.pending_charges', impact: -Math.round(0.25 * max), reason: 'Pending charges reduce the score.' });
    explanation += ' Pending charges adjusted score downward.';
  }

  // Active supervision (parole/probation) — small negative.
  if (candidate.supervisionStatus && candidate.supervisionStatus !== 'none') {
    raw = Math.max(0, raw - 0.1);
    signals.push(`supervision=${candidate.supervisionStatus}`);
    trail.push({ ruleId: 'time.supervision', impact: -Math.round(0.1 * max), reason: `Active supervision (${candidate.supervisionStatus}) applied a small downward adjustment.` });
  }

  trail.push({ ruleId: 'time.base', impact: Math.round(raw * max) - max, reason: explanation });

  return makeComponent(raw, max, 'Time since conviction / release', explanation, signals);
}

/** 6. Candidate strength offset — credentials & relevant experience. */
function scoreCandidateStrength(
  candidate: CandidateProfile,
  job: JobInput,
  trail: AuditItem[],
): ScoreComponent {
  const max = SCORE_WEIGHTS.candidateStrengthOffset;
  const certs = (candidate.certifications ?? []).map((c) => c.toLowerCase());
  const exp = (candidate.workExperienceIndustries ?? []).map((c) => c.toLowerCase());
  const jobIndustry = (job.industry ?? '').toLowerCase();
  const jobText = `${job.title} ${job.description ?? ''}`.toLowerCase();

  const positives: string[] = [];

  const recognizedCerts = ['osha_10', 'osha_30', 'osha 10', 'osha 30', 'cdl', 'cdl-a', 'cdl-b', 'forklift', 'servsafe', 'nccer', 'welding', 'aws certified welder', 'security+', 'comptia', 'a+', 'network+'];
  const certsMatched = certs.filter((c) => recognizedCerts.some((r) => c.includes(r) || r.includes(c)));
  if (certsMatched.length) positives.push(`certifications: ${certsMatched.join(', ')}`);

  if (exp.includes(jobIndustry) && jobIndustry) positives.push(`work experience in ${jobIndustry}`);

  if (candidate.educationLevel && ['some_college', 'associate', 'bachelor', 'graduate'].includes(candidate.educationLevel)) {
    positives.push(`education: ${candidate.educationLevel}`);
  }
  if (candidate.transportationAccess) positives.push('reliable transportation');

  // Per-cert match bonus (capped). Apprenticeships boost when the job is one.
  let raw = 0.4 + Math.min(0.5, 0.15 * positives.length);
  if (job.isApprenticeship && (certsMatched.length > 0 || exp.length > 0)) {
    raw = Math.min(1, raw + 0.1);
    positives.push('apprenticeship + relevant prep');
  }

  // Title-keyword fit boost — e.g. forklift cert + warehouse job.
  if (certsMatched.some((c) => c.includes('forklift')) && /forklift|warehouse|materials handler/.test(jobText)) {
    raw = Math.min(1, raw + 0.05);
    positives.push('cert directly relevant to job duties');
  }

  trail.push({
    ruleId: 'strength.summary',
    impact: Math.round(raw * max) - Math.round(0.5 * max),
    reason: positives.length ? `Candidate strengths applied: ${positives.join('; ')}.` : 'No specific candidate strengths registered.',
  });

  const explanation = positives.length
    ? 'Relevant credentials / experience boosted the score modestly.'
    : 'No relevant credentials or experience detected; neutral.';

  return makeComponent(raw, max, 'Candidate strength offset', explanation, positives);
}

/** 7. Location protections — placeholder stub for state-specific rules. */
function scoreLocationProtections(
  job: JobInput,
  trail: AuditItem[],
): ScoreComponent {
  const max = SCORE_WEIGHTS.locationProtections;
  // TODO(state-rules): expand with state ban-the-box / fair-chance laws,
  //   licensing-board rules, expungement statutes, and timing requirements.
  //   For now we return:
  //     - "some_protection" for ~12 states + DC with codified Fair Chance
  //       hiring laws covering private employers.
  //     - "strong_protection" for CA, NY, IL, MA, WA which have the
  //       most expansive rules.
  //     - "unknown" otherwise.
  const region = (job.locationRegion ?? '').toUpperCase();
  const strongStates = new Set(['CA', 'NY', 'IL', 'MA', 'WA']);
  const someStates = new Set(['CT', 'CO', 'DC', 'HI', 'MD', 'MN', 'NJ', 'OR', 'RI', 'VT', 'NM']);

  let bucket: 'unknown' | 'some_protection' | 'strong_protection' = 'unknown';
  if (strongStates.has(region)) bucket = 'strong_protection';
  else if (someStates.has(region)) bucket = 'some_protection';

  const raw = bucket === 'strong_protection' ? 1 : bucket === 'some_protection' ? 0.7 : 0.5;
  trail.push({
    ruleId: `location.${bucket}`,
    impact: Math.round(raw * max) - Math.round(0.5 * max),
    reason: `Location "${region || 'unknown'}" → ${bucket}.`,
  });

  const explanation = bucket === 'strong_protection'
    ? `${region} has strong fair-chance hiring protections.`
    : bucket === 'some_protection'
      ? `${region} has some fair-chance hiring protections.`
      : 'Location-specific protections unknown for this region.';

  return makeComponent(raw, max, 'Location protections', explanation, [`bucket=${bucket}`]);
}

// ────────────────────────────────────────────────────────────────────
// Risk level coarse-grouping (separate from chance band)
// ────────────────────────────────────────────────────────────────────

function deriveRiskLevel(
  worstMatrix: MatrixMatch,
  signals: SignalsResult,
  industryLevel: number,
): RiskLevel {
  if (worstMatrix.level === 'high' && signals.hasCriticalBarrier) return 'very_high';
  if (worstMatrix.level === 'high') return 'high';
  if (signals.hasCriticalBarrier) return 'high';
  if (worstMatrix.level === 'medium' || industryLevel >= 3) return 'medium';
  return 'low';
}

// ────────────────────────────────────────────────────────────────────
// Public entry point
// ────────────────────────────────────────────────────────────────────

/**
 * Score a single (candidate, job) pair. Pure / deterministic / O(text).
 */
export function scoreJobCompatibility(
  candidate: CandidateProfile,
  job: JobInput,
): CompatibilityRating {
  const auditTrail: AuditItem[] = [];

  const signals = detectSignals({ title: job.title, company: job.company, description: job.description });
  const posture = classifyEmployerPosture(signals, { excludesFelons: job.excludesFelons, riskTier: job.riskTier, description: job.description });

  // Per-component scoring.
  const dutyResult = scoreConvictionToDuty(candidate, job, auditTrail);
  const dutyComp = dutyResult.component;

  const barrierComp = scoreHardBarriers(signals, auditTrail);
  const postureComp = scoreEmployerPosture(posture, signals, auditTrail);
  const industryComp = scoreIndustrySensitivity(job, auditTrail);
  const timeComp = scoreTimeSince(candidate, auditTrail);
  const strengthComp = scoreCandidateStrength(candidate, job, auditTrail);
  const locationComp = scoreLocationProtections(job, auditTrail);

  const breakdown: Record<ScoreComponentKey, ScoreComponent> = {
    convictionToDutyRelevance: dutyComp,
    hardBarrierSignals: barrierComp,
    employerFairChancePosture: postureComp,
    industrySensitivity: industryComp,
    timeSinceConvictionOrRelease: timeComp,
    candidateStrengthOffset: strengthComp,
    locationProtections: locationComp,
  };

  let total =
    dutyComp.weightedScore +
    barrierComp.weightedScore +
    postureComp.weightedScore +
    industryComp.weightedScore +
    timeComp.weightedScore +
    strengthComp.weightedScore +
    locationComp.weightedScore;

  // ─── Hard floors ──────────────────────────────────────────────────
  // The point of these caps is to prevent strong scores in other
  // components (e.g. 7+ years since release + fair-chance language) from
  // drowning out a clear duty conflict that would realistically block the
  // application. Each cap is also recorded in the audit trail.
  const industryLevel = getIndustrySensitivity(job.industry);
  if (signals.hasCriticalBarrier) {
    total = Math.min(total, 44);
    auditTrail.push({ ruleId: 'floor.critical_barrier', impact: 0, reason: 'Critical hard barrier caps total score below high-chance band.' });
  } else if (
    dutyResult.worst.level === 'high' &&
    (candidate.convictionType === 'registry_related' ||
      candidate.convictionType === 'violent_offense' ||
      candidate.convictionType === 'financial_fraud' ||
      candidate.convictionType === 'weapons_related' ||
      industryLevel >= 3)
  ) {
    // High duty conflict + sensitive conviction OR high-sensitivity
    // industry → cap below the medium band.
    total = Math.min(total, 44);
    auditTrail.push({ ruleId: 'floor.high_duty_conflict', impact: 0, reason: 'High duty conflict combined with sensitive conviction or high-sensitivity industry caps the score below the medium-chance band.' });
  } else if (dutyResult.worst.level === 'high') {
    total = Math.min(total, 60);
    auditTrail.push({ ruleId: 'floor.high_duty_general', impact: 0, reason: 'High duty conflict caps the score below the strong-match band.' });
  }

  // Excluded-industries hard fail (user explicitly blacklisted this industry).
  if (job.industry && (candidate.excludedIndustries ?? []).map((s) => s.toLowerCase()).includes(job.industry.toLowerCase())) {
    total = Math.min(total, 30);
    auditTrail.push({ ruleId: 'floor.excluded_industry', impact: -30, reason: `User excluded "${job.industry}" from desired industries.` });
  }

  total = clamp100(total);
  const chance = chanceFromScore(total);
  const label = labelFromChance(chance);
  const riskLevel = deriveRiskLevel(dutyResult.worst, signals, getIndustrySensitivity(job.industry));

  const explanations = generateExplanations({
    candidate,
    job,
    breakdown,
    score: total,
    chance,
    riskLevel,
    signals,
    posture,
    matrixWorst: dutyResult.worst,
    matrixAll: dutyResult.allMatches,
  });

  return {
    score: total,
    chance,
    label,
    riskLevel,
    summary: explanations.summary,
    scoreBreakdown: breakdown,
    riskFactors: explanations.riskFactors,
    positiveFactors: explanations.positiveFactors,
    possibleBarriers: explanations.possibleBarriers,
    chanceImprovers: explanations.chanceImprovers,
    recommendedNextStep: recommendNextStep(chance, candidate.convictionType, dutyResult.worst, signals),
    caseworkerNotes: explanations.caseworkerNotes,
    auditTrail,
  };
}

// Re-export some types for convenience to consumers of this entry point.
export type { Signal, EmployerPosture };
