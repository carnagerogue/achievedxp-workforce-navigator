/**
 * Decision support — turns a job + its classification evidence into a plain,
 * non-stigmatizing recommendation a person can act on WITHOUT reading a score:
 *   Good next step · Worth checking first · Likely barrier
 * plus a "Fit and next steps" breakdown (why it may work, what to verify,
 * what's unknown, the recommended action) and an evidence audit trail.
 *
 * Careful language: never implies an employer will hire; distinguishes posting
 * evidence, inference, and unknowns; always pairs with a guidance disclaimer.
 * Pure + tested so cards, detail pages, and caseworker views share one source.
 */
import type { JobDto } from '../index';
import type { FieldConfidence } from '../classification';

export type DecisionBand = 'good_next_step' | 'worth_checking' | 'likely_barrier';

export interface DecisionEvidence {
  label: string;
  value: string;
  status: FieldConfidence;
  basis: string;
}

export interface DecisionSupport {
  band: DecisionBand;
  label: string;
  reason: string;
  why: string[];        // Why this may work
  verify: string[];     // What to verify before applying
  unknowns: string[];   // Missing or uncertain information
  nextAction: string;   // Recommended next action
  evidence: DecisionEvidence[];
  disclaimer: string;
}

export interface DecisionContext {
  /** A categorical legal bar for the viewer's conviction (from offense filters). */
  hardBlocked?: boolean;
  hardBlockReason?: string | null;
  /** The viewer selected a background context (drives "your selected background"). */
  convictionSelected?: boolean;
}

export const DECISION_LABEL: Record<DecisionBand, string> = {
  good_next_step: 'Good next step',
  worth_checking: 'Worth checking first',
  likely_barrier: 'Likely barrier',
};

const DISCLAIMER = 'Guidance only — not an employer decision. The employer makes the final hiring choice.';

export function decisionFor(job: JobDto, ctx: DecisionContext = {}): DecisionSupport {
  const c = job.classification;
  const why: string[] = [];
  const verify: string[] = [];
  const unknowns: string[] = [];
  const evidence: DecisionEvidence[] = [];

  // Pull confidences/values from the classification meta when present, else
  // fall back to the flat JobDto fields (treated as inferred).
  const fairChance = c?.fairChance ?? { value: false, confidence: 'uncertain' as FieldConfidence, basis: 'not classified' };
  const excludes = c?.excludesFelons ?? { value: job.excludesFelons, confidence: 'inferred' as FieldConfidence, basis: 'job flag' };
  const bgCheck = c?.backgroundCheckLikely ?? { value: job.backgroundCheckLikely, confidence: 'inferred' as FieldConfidence, basis: 'job flag' };
  const industry = c?.industry ?? { value: job.industry, confidence: (job.industry ? 'inferred' : 'uncertain') as FieldConfidence, basis: 'job field' };
  const appr = c?.apprenticeship;

  // ── Evidence audit trail ──
  evidence.push({ label: 'Fair-chance hiring', value: fairChance.value ? 'stated' : 'not stated', status: fairChance.confidence, basis: fairChance.basis });
  evidence.push({ label: 'Excludes records', value: excludes.value ? 'yes' : 'no', status: excludes.confidence, basis: excludes.basis });
  evidence.push({ label: 'Background check', value: bgCheck.value ? 'likely' : 'not stated', status: bgCheck.confidence, basis: bgCheck.basis });
  evidence.push({ label: 'Industry', value: industry.value ?? 'unclear', status: industry.confidence, basis: industry.basis });
  if (appr) evidence.push({ label: 'Apprenticeship', value: appr.value, status: appr.confidence, basis: appr.basis });

  // ── Why / verify / unknowns from confidence ──
  if (fairChance.value && fairChance.confidence === 'verified') {
    why.push('The posting explicitly states fair-chance / second-chance hiring.');
  }
  if (!excludes.value && excludes.confidence !== 'uncertain') {
    why.push('No clean-record language was detected in the posting.');
  }
  if (appr && (appr.value === 'registered' || appr.value === 'pre_apprenticeship')) {
    why.push('This is a structured, earn-while-you-learn pathway.');
  }
  if (excludes.value && excludes.confidence === 'inferred') {
    verify.push('This field typically runs a strict background check — confirm the employer’s policy.');
  }
  if (bgCheck.value) {
    verify.push('A background check is likely — know in advance what it may show.');
  }
  if (fairChance.confidence === 'uncertain' && !excludes.value) {
    unknowns.push('Whether the employer is fair-chance is not stated in the posting.');
  }
  if (excludes.confidence === 'uncertain') {
    unknowns.push('The posting doesn’t state its background-check or record policy.');
  }
  if (industry.confidence === 'uncertain') {
    unknowns.push('The role and industry are unclear from the posting.');
  }
  if (c && !c.dataComplete) {
    unknowns.push('The posting is sparse, so these signals are low-confidence.');
  }

  // ── Band ──
  let band: DecisionBand;
  let reason: string;
  let nextAction: string;

  if (ctx.hardBlocked) {
    band = 'likely_barrier';
    reason = ctx.hardBlockReason || 'A legal restriction for your selected background context likely applies to this role.';
    nextAction = 'Talk this barrier through with your caseworker before spending time on it.';
  } else if (excludes.value) {
    band = 'likely_barrier';
    reason = excludes.confidence === 'verified'
      ? capitalize(excludes.basis) + '.'
      : 'This role likely requires a clean record or strict background check.';
    nextAction = 'Weigh this against lower-barrier options, or discuss it with your caseworker.';
  } else if (fairChance.value && fairChance.confidence === 'verified') {
    band = 'good_next_step';
    reason = 'This employer states fair-chance hiring, and no exclusion was detected.';
    nextAction = 'Strong next step — get your résumé ready and apply.';
  } else if (!excludes.value && excludes.confidence !== 'uncertain' && (job.riskTier === 'LOW')) {
    band = 'good_next_step';
    reason = ctx.convictionSelected
      ? 'No clean-record language detected; the duties don’t appear related to your selected background context.'
      : 'No clean-record language detected; this is a lower-barrier role.';
    nextAction = 'Looks like a good fit to pursue — verify anything below, then apply.';
  } else {
    band = 'worth_checking';
    reason = (c && !c.dataComplete)
      ? 'The posting is missing key details — verify the items below before applying.'
      : 'Mixed signals — a few things are worth checking before you apply.';
    nextAction = 'Check the “what to verify” items, then apply if they clear.';
  }

  return { band, label: DECISION_LABEL[band], reason, why, verify, unknowns, nextAction, evidence, disclaimer: DISCLAIMER };
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
