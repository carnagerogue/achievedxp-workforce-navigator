/**
 * Background Explanation generator — produces strengths-based statement
 * drafts the user can adapt for applications and interviews.
 *
 * Tone rules (enforced by templates, NOT by AI):
 *   - Honest, accountable, professional
 *   - Strengths-based, no over-emotion, no over-detail
 *   - No legal admissions beyond "past conviction" / "past mistake"
 *   - Always include the disclaimer that this is not legal advice
 *
 * Inputs are deliberately small — just the conviction class, time
 * elapsed, supervision state, and a few profile signals — so users
 * can generate a draft in seconds without re-typing their whole story.
 */
import type { ConvictionType, CandidateProfile } from './types';

export type BackgroundExplanationVersion =
  | 'short_application'   // 2–3 short sentences for an application form
  | 'interview'            // 4–6 sentences, conversational
  | 'caseworker_reviewed'  // brief, more formal — designed for caseworker editing
  | 'very_brief';          // single sentence for tight character limits

export interface BackgroundExplanationInput {
  convictionType?: ConvictionType;
  yearsSinceRelease?: number | null;
  yearsSinceConviction?: number | null;
  supervisionStatus?: CandidateProfile['supervisionStatus'];
  expungedOrSealed?: boolean;
  /**
   * Short list of post-conviction achievements the user wants to highlight.
   * E.g. ["completed forklift certification", "stable employment for 14 months"].
   * 0–4 items recommended; the generator will use up to 3.
   */
  achievements?: string[];
}

export interface BackgroundExplanation {
  version: BackgroundExplanationVersion;
  text: string;
  /** Approximate character length — useful for fitting into application fields. */
  length: number;
  /** Disclaimer to display alongside the text. */
  disclaimer: string;
}

const DISCLAIMER =
  'This is not legal advice. Some situations may require guidance from a caseworker, attorney, or reentry specialist. Always check what each employer specifically asks before disclosing.';

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function timeFraming(input: BackgroundExplanationInput): string {
  const ref = input.yearsSinceRelease ?? input.yearsSinceConviction;
  if (ref == null) return 'Since then';
  if (ref < 1) return 'In the time since';
  if (ref < 2) return `Over the past year`;
  if (ref < 5) return `Over the past ${Math.round(ref)} years`;
  return `Over the past ${Math.round(ref)} years`;
}

function achievementClause(input: BackgroundExplanationInput): string {
  const items = (input.achievements ?? []).slice(0, 3).filter(Boolean);
  if (items.length === 0) return 'I have focused on building stability and preparing for long-term employment';
  if (items.length === 1) return `I have ${items[0]}`;
  if (items.length === 2) return `I have ${items[0]} and ${items[1]}`;
  return `I have ${items[0]}, ${items[1]}, and ${items[2]}`;
}

function expungementClause(input: BackgroundExplanationInput): string {
  return input.expungedOrSealed
    ? ' I have also pursued record relief where eligible.'
    : '';
}

// ────────────────────────────────────────────────────────────────────
// Templates (one per version) — deterministic, no AI
// ────────────────────────────────────────────────────────────────────

function shortApplication(input: BackgroundExplanationInput): string {
  const time = timeFraming(input);
  const achievements = achievementClause(input);
  return [
    'I want to be transparent that I have a past conviction.',
    `${time}, ${achievements}.`,
    'I understand the responsibility this role requires and am ready to demonstrate reliability and accountability.',
  ].join(' ') + expungementClause(input);
}

function interview(input: BackgroundExplanationInput): string {
  const time = timeFraming(input);
  const achievements = achievementClause(input);
  const supervision =
    input.supervisionStatus && input.supervisionStatus !== 'none'
      ? ` I am currently completing supervision and have stayed in good standing.`
      : '';
  return [
    'Thank you for the opportunity to discuss this directly.',
    'I want to be upfront that I have a past conviction.',
    `${time}, ${achievements}.${supervision}`,
    'I take full responsibility for that period of my life.',
    'I understand the trust and reliability this role requires, and I am committed to bringing professionalism, focus, and a strong work ethic every day.',
  ].join(' ') + expungementClause(input);
}

function caseworkerReviewed(input: BackgroundExplanationInput): string {
  const time = timeFraming(input);
  const achievements = achievementClause(input);
  return [
    'The applicant has a past conviction.',
    `${time}, the applicant ${achievements.replace(/^I have /, 'has ')}.`,
    'The applicant is prepared to discuss the conviction professionally and to provide any documentation the employer requires.',
    'A caseworker is supporting the applicant\u2019s reentry into the workforce.',
  ].join(' ') + expungementClause(input).replace(' I have', ' The applicant has');
}

function veryBrief(input: BackgroundExplanationInput): string {
  const time = timeFraming(input);
  return `I have a past conviction; ${time.toLowerCase()}, I have focused on building stability and am ready to commit to this role.`;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

const TEMPLATES: Record<BackgroundExplanationVersion, (input: BackgroundExplanationInput) => string> = {
  short_application: shortApplication,
  interview,
  caseworker_reviewed: caseworkerReviewed,
  very_brief: veryBrief,
};

export function generateBackgroundExplanation(
  version: BackgroundExplanationVersion,
  input: BackgroundExplanationInput,
): BackgroundExplanation {
  const text = TEMPLATES[version](input);
  return {
    version,
    text,
    length: text.length,
    disclaimer: DISCLAIMER,
  };
}

/** Generate all four versions at once — useful for the UI tabs. */
export function generateAllVersions(input: BackgroundExplanationInput): BackgroundExplanation[] {
  return (Object.keys(TEMPLATES) as BackgroundExplanationVersion[])
    .map((v) => generateBackgroundExplanation(v, input));
}

export const BACKGROUND_EXPLANATION_DISCLAIMER = DISCLAIMER;
