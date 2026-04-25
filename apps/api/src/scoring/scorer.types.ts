import { Conviction, Job, UserProfile } from '@prisma/client';

/** Scoring input: a user's profile + their convictions and a single canonical job. */
export interface ScoringContext {
  profile: UserProfile;
  convictions: Conviction[];
  job: Job;
}

/** Deterministic 0..100 per-component subscores. Must sum to <= 100. */
export interface ScoreBreakdown {
  industry: number;       // 0..25
  skills: number;         // 0..25
  certifications: number; // 0..15
  experience: number;     // 0..15
  location: number;       // 0..10
  risk: number;           // 0..10
}

export interface ScoreResult {
  /** Integer 0..100. */
  score: number;
  breakdown: ScoreBreakdown;
  explanation: string;

  /**
   * Hard-filter decision. If true, this job must not appear in Top/Medium
   * matches — surface it only in the "Jobs to Avoid" bucket with the reason.
   * Per Phase-0 decision: legal restrictions are hard filters, not score penalties.
   */
  disqualified: boolean;
  disqualificationReasons: string[];
}

export interface Scorer {
  score(ctx: ScoringContext): ScoreResult;
}

export const SCORER = Symbol('SCORER');

/** Component weight caps — kept here so tuning is in one place. */
export const WEIGHTS = {
  industry: 25,
  skills: 25,
  certifications: 15,
  experience: 15,
  location: 10,
  risk: 10,
} as const;
