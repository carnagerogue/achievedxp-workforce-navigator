/**
 * Canonical job scorer — the single source of truth used by every surface
 * (dashboard matches, browse /jobs, job detail, and Caseworker Mode) so a job
 * can never show one score in one place and a different one elsewhere.
 *
 * Blends conviction compatibility (legal/duty barriers) with realistic fit
 * (seniority, domain, skills, location), caps for attainability, and flags
 * categorical barriers: clearance/security roles, clean-record postings,
 * and offense-specific legal bars. Pure + isomorphic (no server-only deps) so
 * the server mock backend and the client pages share it.
 */
import {
  scoreJobCompatibility,
  isOffenseHardBlocked,
  type JobDto,
  type JobInput,
  type CandidateProfile,
  type CompatibilityRating,
} from '@dxp/shared';
import { realisticFit, type RealisticFit, type FitBreakdown } from './realistic-fit';
import type { StoredProfile } from './profile-store';

// Only explicit clearance/suitability language or security-sensitive duties
// are categorical. Federal employment by itself is not: USAJOBS and OPM say
// people with records are eligible for the vast majority of federal jobs.
const EXCLUSIONARY_EMPLOYER = new RegExp(
  [
    '\\bsecurity clearance\\b', '\\btop[\\s-]secret\\b', '\\bsecret clearance\\b', '\\bpolice officer\\b',
    '\\bpublic trust\\b', '\\bts\\/sci\\b', '\\bcjis\\b', '\\bhspd[\\s-]?12\\b', '\\bpiv credential\\b',
    '\\bcorrectional? officer\\b', '\\bdeputy (sheriff|marshal)\\b', '\\bspecial agent\\b',
    '\\barmed (guard|security)\\b', '\\bprison guard\\b',
  ].join('|'),
  'i',
);

export function isExclusionaryEmployer(job: { company?: string | null; title?: string | null; description?: string | null }): boolean {
  return EXCLUSIONARY_EMPLOYER.test(`${job.company ?? ''} ${job.title ?? ''} ${job.description ?? ''}`);
}

export function jobToInput(j: JobDto): JobInput {
  return {
    id: j.id, title: j.title, company: j.company, description: j.description,
    industry: j.industry, riskTier: j.riskTier, excludesFelons: j.excludesFelons,
    backgroundCheckLikely: j.backgroundCheckLikely, isApprenticeship: j.isApprenticeship,
    remote: j.remote, locationRegion: j.locationRegion, locationCity: j.locationCity,
    requiredSkills: j.requiredSkills, requiredCertifications: j.requiredCertifications,
  };
}

/** Worst-case conviction compatibility across every conviction a person carries. */
function worstCompatibility(job: JobDto, candidates: CandidateProfile[]): CompatibilityRating {
  const input = jobToInput(job);
  const list = candidates.length > 0 ? candidates : [{}];
  let worst = scoreJobCompatibility(list[0], input);
  for (let i = 1; i < list.length; i++) {
    const r = scoreJobCompatibility(list[i], input);
    if (r.score < worst.score) worst = r;
  }
  return worst;
}

/**
 * The conviction-dependent part of a job's score — independent of the user's
 * credentials, so callers that simulate credential changes (insights) can
 * compute it once per job and rescore cheaply.
 */
export interface JobScoreContext {
  rating: CompatibilityRating;
  hardBlockReason: string | null;
  exclusionary: boolean;
}

export function jobScoreContext(
  inputs: Pick<ScoreInputs, 'candidates' | 'convictionTypes'>,
  job: JobDto,
): JobScoreContext {
  const rating = worstCompatibility(job, inputs.candidates);
  let hardBlockReason: string | null = null;
  for (const ct of inputs.convictionTypes) {
    const hit = isOffenseHardBlocked(ct as CandidateProfile['convictionType'], { industry: job.industry, title: job.title });
    if (hit.blocked) { hardBlockReason = hit.reason; break; }
  }
  return { rating, hardBlockReason, exclusionary: isExclusionaryEmployer(job) };
}

export type MatchChance = 'high' | 'medium' | 'low';
const LABEL: Record<MatchChance, string> = { high: 'Strong Match', medium: 'Possible Match', low: 'Challenging Match' };

export interface UnifiedScore {
  jobId: string;
  score: number;          // 0–100
  chance: MatchChance;
  label: string;
  breakdown: FitBreakdown;
  explanation: string;
  /** Categorical barrier reasons (clearance/security role, clean-record, legal bar). */
  flags: string[];
  hardBlockReason: string | null;
  rating: CompatibilityRating;
  fit: RealisticFit;
}

export interface ScoreInputs {
  candidates: CandidateProfile[];
  profile: StoredProfile | null;
  convictionTypes: string[];
  hasConvictions: boolean;
}

function buildExplanation(rating: CompatibilityRating, fit: RealisticFit): string {
  const parts: string[] = [];
  if (fit.factors.positive[0]) parts.push(fit.factors.positive[0][0].toUpperCase() + fit.factors.positive[0].slice(1));
  if (fit.factors.caution[0]) parts.push(fit.factors.caution[0]);
  if (parts.length === 0) parts.push(rating.summary);
  else if (rating.chance === 'high') parts.push('no legal barriers flagged');
  return parts.join('; ') + '.';
}

/**
 * Score one job for a candidate. Identical math everywhere it's called — the
 * server match/insight routes and the client pages all go through here.
 * Pass a precomputed `ctx` only when rescoring the same job with a varied
 * profile (credential simulation); it must come from `jobScoreContext`.
 */
export function scoreJobUnified(inputs: ScoreInputs, job: JobDto, ctx?: JobScoreContext): UnifiedScore {
  const { profile, hasConvictions } = inputs;
  const { rating, hardBlockReason, exclusionary } = ctx ?? jobScoreContext(inputs, job);
  const fit = realisticFit(profile, job);

  let score = hasConvictions
    ? 0.65 * rating.score + 0.35 * fit.total
    : 0.4 * rating.score + 0.6 * fit.total;
  score = Math.min(score, fit.attainabilityCap);

  const flags: string[] = [];
  if (exclusionary) { score = Math.min(score, 30); flags.push('This posting signals a clearance or security-sensitive role that may create a serious barrier.'); }
  if (job.excludesFelons) { score = Math.min(score, 25); flags.push('Posting states a clean record is required.'); }
  if (hardBlockReason) { score = Math.min(score, 25); flags.push(hardBlockReason); }
  score = Math.max(0, Math.round(score));

  const barred = exclusionary || Boolean(job.excludesFelons) || hardBlockReason !== null;
  const chance: MatchChance = barred || rating.chance === 'low' || score < 40
    ? 'low'
    : score >= 70 && rating.chance === 'high' ? 'high' : 'medium';

  return {
    jobId: job.id,
    score,
    chance,
    label: LABEL[chance],
    breakdown: fit.breakdown,
    explanation: flags.length && chance === 'low' ? flags[0] : buildExplanation(rating, fit),
    flags,
    hardBlockReason,
    rating,
    fit,
  };
}
