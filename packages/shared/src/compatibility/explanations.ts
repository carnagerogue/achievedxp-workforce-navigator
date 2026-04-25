/**
 * Explanation generators — pure functions that turn the structured score
 * into the user-facing prose surfaces (summary, possible barriers, chance
 * improvers, caseworker notes, recommended next step).
 *
 * Wording rules (enforced here and in tests):
 *   - Never use stigmatizing terminology. Use "Registry-related conviction",
 *     "restricted environment", "vulnerable-population setting".
 *   - Never make absolute promises ("you'll get this job", "this employer
 *     will hire you").
 *   - Use neutral framing: "Higher chance", "Lower chance", "Potential
 *     concern", "Caseworker review recommended".
 */
import {
  CandidateProfile,
  ChanceLevel,
  CompatibilityRating,
  ConvictionType,
  JobInput,
  RiskLevel,
  ScoreComponentKey,
  ScoreComponent,
} from './types';
import { Signal, SignalsResult, EmployerPosture } from './signals';
import type { MatrixMatch } from './risk-matrix';

// ────────────────────────────────────────────────────────────────────
// Summary line — one sentence for the job-card subtitle
// ────────────────────────────────────────────────────────────────────

export function buildSummary(input: {
  chance: ChanceLevel;
  matrixWorst: MatrixMatch;
  signals: SignalsResult;
  posture: EmployerPosture;
}): string {
  const { chance, matrixWorst, signals, posture } = input;

  // High-chance summary.
  if (chance === 'high') {
    if (posture === 'positive') {
      return 'Low conviction-to-duty conflict and the employer uses fair-chance language.';
    }
    if (signals.hardBarriers.length === 0) {
      return 'Low conviction-to-duty conflict. No clean-record language found in the posting.';
    }
    return 'Low conviction-to-duty conflict; only minor barrier signals detected.';
  }

  // Medium-chance.
  if (chance === 'medium') {
    if (signals.hasCriticalBarrier) {
      return 'Posting includes background-related language; review carefully before applying.';
    }
    if (matrixWorst.level === 'high') {
      return matrixWorst.reason;
    }
    if (matrixWorst.level === 'medium') {
      return 'Background check likely; ' + matrixWorst.reason.replace(/^\w/, (c) => c.toLowerCase());
    }
    return 'Background check is possible. Review the duties before applying.';
  }

  // Low-chance.
  if (signals.hasCriticalBarrier) {
    return 'Posting requires a clean record / clearance. Consider similar lower-risk roles.';
  }
  if (matrixWorst.level === 'high') {
    return matrixWorst.reason + ' Caseworker review recommended.';
  }
  return 'Role likely involves restricted environments, clearance, or regulated duties.';
}

// ────────────────────────────────────────────────────────────────────
// Risk + positive factor lists
// ────────────────────────────────────────────────────────────────────

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value);
}

function buildRiskFactors(input: {
  matrixWorst: MatrixMatch;
  matrixAll: MatrixMatch[];
  signals: SignalsResult;
  candidate: CandidateProfile;
  posture: EmployerPosture;
}): string[] {
  const factors: string[] = [];
  if (input.matrixWorst.level === 'high') pushUnique(factors, input.matrixWorst.reason);
  for (const s of input.signals.hardBarriers) {
    if (s.severity === 'critical' || s.severity === 'high') pushUnique(factors, s.message);
  }
  if (input.posture === 'very_strict') pushUnique(factors, 'Posting language signals the employer will not consider applicants with criminal history.');
  else if (input.posture === 'strict') pushUnique(factors, 'Posting language signals strict background-check requirements.');
  if (input.candidate.hasPendingCharges) pushUnique(factors, 'Pending charges may affect the application.');
  if (input.candidate.supervisionStatus === 'incarcerated') pushUnique(factors, 'Currently incarcerated — many employers cannot hire active inmates.');
  return factors;
}

function buildPositiveFactors(input: {
  signals: SignalsResult;
  candidate: CandidateProfile;
  posture: EmployerPosture;
  breakdown: Record<ScoreComponentKey, ScoreComponent>;
}): string[] {
  const factors: string[] = [];
  for (const s of input.signals.fairChance) {
    if (s.severity === 'positive') pushUnique(factors, s.message);
  }
  if (input.candidate.expungedOrSealed) pushUnique(factors, 'Conviction is expunged or sealed.');
  if (input.breakdown.timeSinceConvictionOrRelease.rawScore >= 0.95) pushUnique(factors, '7+ years since conviction or release.');
  if (input.breakdown.candidateStrengthOffset.signals.length > 0) {
    pushUnique(factors, `Candidate strengths recorded (${input.breakdown.candidateStrengthOffset.signals.join(', ')}).`);
  }
  if (input.breakdown.locationProtections.rawScore >= 1) pushUnique(factors, input.breakdown.locationProtections.explanation);
  return factors;
}

// ────────────────────────────────────────────────────────────────────
// Possible barriers + chance improvers
// ────────────────────────────────────────────────────────────────────

function buildPossibleBarriers(input: {
  signals: SignalsResult;
  matrixWorst: MatrixMatch;
  candidate: CandidateProfile;
}): string[] {
  const out: string[] = [];
  for (const s of input.signals.hardBarriers) {
    if (s.severity === 'critical') pushUnique(out, s.message);
  }
  if (input.matrixWorst.level === 'high') pushUnique(out, input.matrixWorst.reason);
  if (input.candidate.hasPendingCharges) pushUnique(out, 'Pending charges typically pause hiring decisions until resolved.');
  if (input.candidate.supervisionStatus === 'incarcerated') pushUnique(out, 'Active incarceration limits eligibility for most roles.');
  return out;
}

function buildChanceImprovers(input: {
  candidate: CandidateProfile;
  matrixWorst: MatrixMatch;
  signals: SignalsResult;
  conviction: ConvictionType;
}): string[] {
  const out: string[] = [];
  if (!input.candidate.expungedOrSealed) pushUnique(out, 'Pursue expungement or record sealing if eligible in your state.');
  if (!(input.candidate.certifications ?? []).some((c) => /osha|cdl|forklift|servsafe|nccer|aws/i.test(c))) {
    pushUnique(out, 'Add an industry-recognized certification (e.g. OSHA 10, forklift, ServSafe) to strengthen your profile.');
  }
  if (input.candidate.hasPendingCharges) pushUnique(out, 'Resolve pending charges before applying to background-sensitive roles.');
  if (input.signals.hasCriticalBarrier) pushUnique(out, 'Target similar roles without clean-record / clearance language.');
  if (input.matrixWorst.level === 'high') {
    if (input.conviction === 'registry_related') {
      pushUnique(out, 'Consider roles with no vulnerable-population access, residential access, or restricted-site requirements.');
    } else if (input.conviction === 'dui_dwi') {
      pushUnique(out, 'Consider non-driving versions of this role.');
    } else if (input.conviction === 'financial_fraud') {
      pushUnique(out, 'Target operations / labor / construction roles without fiduciary or financial-record access.');
    } else if (input.conviction === 'violent_offense') {
      pushUnique(out, 'Target back-of-house, manufacturing, or warehouse roles without vulnerable-population access.');
    } else if (input.conviction === 'drug_distribution') {
      pushUnique(out, 'Avoid roles with medication handling, pharmacy access, or controlled substances.');
    } else if (input.conviction === 'weapons_related') {
      pushUnique(out, 'Target roles without weapons / firearms / armed-security duties.');
    }
  }
  if ((input.candidate.workExperienceIndustries ?? []).length === 0) {
    pushUnique(out, 'Document any post-release work experience and add it to your profile.');
  }
  return out;
}

function buildCaseworkerNotes(input: {
  conviction: ConvictionType;
  matrixWorst: MatrixMatch;
  signals: SignalsResult;
  candidate: CandidateProfile;
}): string[] {
  const out: string[] = [];
  if (input.conviction === 'registry_related') {
    out.push('Registry-related conviction selected. Confirm jurisdictional restrictions on residential, school, and vulnerable-population access before submitting an application.');
  }
  if (input.candidate.supervisionStatus && input.candidate.supervisionStatus !== 'none') {
    out.push(`Active supervision (${input.candidate.supervisionStatus}). Confirm probation/parole conditions allow the work environment, hours, and travel.`);
  }
  if (input.signals.hardBarriers.some((s) => s.id === 'cjis' || s.id === 'security_clearance' || s.id === 'top_secret_clearance' || s.id === 'public_trust_clearance')) {
    out.push('Federal suitability / clearance language detected. OPM 5 CFR 731 (and similar agency rules) commonly disqualify recent felony convictions.');
  }
  if (input.signals.hardBarriers.some((s) => s.id === 'school_setting' || s.id === 'children_or_minors')) {
    out.push('Role environment includes minors. Confirm any state fingerprint-based clearance and the applicable disqualifying-conviction list.');
  }
  if (input.matrixWorst.level === 'high') {
    out.push(`Matrix flagged a high duty-conflict rule (${input.matrixWorst.ruleId}). Document the candidate\u2019s individualized assessment factors before applying.`);
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────
// Recommended next step
// ────────────────────────────────────────────────────────────────────

export function recommendNextStep(
  chance: ChanceLevel,
  conviction: ConvictionType,
  matrixWorst: MatrixMatch,
  signals: SignalsResult,
): string {
  if (chance === 'high') {
    return 'Apply now. This role has low detected conflict with the selected conviction history.';
  }

  if (chance === 'medium') {
    return 'Review the employer\u2019s background policy before applying. Prepare a short explanation and supporting documents.';
  }

  // Low chance — try to give a conviction-specific recommendation first.
  const high = matrixWorst.level === 'high';
  if (conviction === 'registry_related' && high) {
    return 'Consider avoiding roles involving schools, childcare, youth programs, healthcare, elder care, residential care, in-home services, vulnerable-population settings, residential access, or restricted sites unless cleared by law or reviewed by a caseworker.';
  }
  if (conviction === 'dui_dwi' && high) {
    return 'Consider non-driving versions of this role or confirm the clean-driving-record requirement with the employer.';
  }
  if (conviction === 'violent_offense' && high) {
    return 'Consider avoiding roles with children, schools, healthcare, elder care, residential care, security, corrections, or unsupervised public-facing duties unless cleared by law or reviewed by a caseworker.';
  }
  if (conviction === 'financial_fraud' && high) {
    return 'Consider non-financial operations, warehouse, construction, manufacturing, food service, or other roles without fiduciary responsibility or financial-record access.';
  }
  if (conviction === 'drug_distribution' && high) {
    return 'Consider avoiding roles with medication handling, pharmacy access, or controlled substances.';
  }
  if (conviction === 'property_theft' && high) {
    return 'Consider roles with less cash handling or prepare references and proof of rehabilitation.';
  }
  if (conviction === 'burglary' && high) {
    return 'Consider roles without residential access or prepare references and proof of rehabilitation.';
  }
  if (conviction === 'weapons_related' && high) {
    return 'Consider roles without weapons / firearms duties.';
  }
  if (signals.hasCriticalBarrier) {
    return 'The posting includes clean-record / clearance language. Consider similar roles without these requirements, or consult a caseworker before applying.';
  }
  return 'Consider applying only with caseworker support or after confirming the background requirements. Similar lower-risk roles may be better first targets.';
}

// ────────────────────────────────────────────────────────────────────
// Aggregate
// ────────────────────────────────────────────────────────────────────

export interface ExplanationBundle {
  summary: string;
  riskFactors: string[];
  positiveFactors: string[];
  possibleBarriers: string[];
  chanceImprovers: string[];
  caseworkerNotes: string[];
}

export function generateExplanations(input: {
  candidate: CandidateProfile;
  job: JobInput;
  breakdown: Record<ScoreComponentKey, ScoreComponent>;
  score: number;
  chance: ChanceLevel;
  riskLevel: RiskLevel;
  signals: SignalsResult;
  posture: EmployerPosture;
  matrixWorst: MatrixMatch;
  matrixAll: MatrixMatch[];
}): ExplanationBundle {
  const summary = buildSummary({ chance: input.chance, matrixWorst: input.matrixWorst, signals: input.signals, posture: input.posture });
  const riskFactors = buildRiskFactors({ matrixWorst: input.matrixWorst, matrixAll: input.matrixAll, signals: input.signals, candidate: input.candidate, posture: input.posture });
  const positiveFactors = buildPositiveFactors({ signals: input.signals, candidate: input.candidate, posture: input.posture, breakdown: input.breakdown });
  const possibleBarriers = buildPossibleBarriers({ signals: input.signals, matrixWorst: input.matrixWorst, candidate: input.candidate });
  const chanceImprovers = buildChanceImprovers({
    candidate: input.candidate,
    matrixWorst: input.matrixWorst,
    signals: input.signals,
    conviction: input.candidate.convictionType ?? 'other',
  });
  const caseworkerNotes = buildCaseworkerNotes({
    conviction: input.candidate.convictionType ?? 'other',
    matrixWorst: input.matrixWorst,
    signals: input.signals,
    candidate: input.candidate,
  });
  return { summary, riskFactors, positiveFactors, possibleBarriers, chanceImprovers, caseworkerNotes };
}
