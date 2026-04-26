/**
 * Training Bridge — turns identified barriers into concrete next-step
 * pathways. Pure deterministic logic; runs alongside the compatibility
 * engine.
 *
 * Output is a stepped pathway:
 *   Step 1: complete forklift certification
 *   Step 2: apply for warehouse associate role
 *   Step 3: build 3–6 months of experience
 *   Step 4: apply for forklift operator / logistics coordinator
 *
 * Each step has a `kind` (training | certification | experience |
 * application | document) so the UI can render appropriate icons /
 * actions. All recommendations come from a curated knowledge base —
 * no AI inference, fully reproducible.
 */
import type { CandidateProfile, JobInput } from './types';

export type TrainingStepKind =
  | 'certification'
  | 'license'
  | 'training'
  | 'experience'
  | 'application'
  | 'document';

export interface TrainingBridgeStep {
  /** Display title — one short imperative phrase. */
  title: string;
  /** Why this step belongs in the pathway, in plain English. */
  reason: string;
  kind: TrainingStepKind;
  /** Stable id for analytics / dedup. */
  id: string;
  /** Estimated duration to complete the step. */
  estDuration?: string;
  /** Optional external link (apprenticeship.gov, OSHA, etc.). */
  externalUrl?: string;
}

export interface TrainingBridge {
  /** Identified gaps the user has relative to this job. */
  gaps: string[];
  /** Ordered next steps. Step 1 is the most immediate / lowest barrier. */
  steps: TrainingBridgeStep[];
  /**
   * If the user is far from this job, the bridge suggests a "stepping
   * stone" intermediate role that's more reachable today.
   */
  steppingStone?: { title: string; reason: string };
}

// ────────────────────────────────────────────────────────────────────
// Knowledge bases — curated, non-exhaustive, easy to extend.
// ────────────────────────────────────────────────────────────────────

/**
 * Job-text patterns → certification / training / license that addresses
 * the gap. First match wins; order from most-specific to most-generic.
 */
interface JobBarrierRule {
  /** Substring(s) in normalized title+description that trigger this rule. */
  triggers: string[];
  step: Omit<TrainingBridgeStep, 'reason'>;
  /** Reason template — uses {role} placeholder. */
  reasonTemplate: string;
}

const RULES: JobBarrierRule[] = [
  {
    triggers: ['osha', 'construction safety', 'safety sensitive', 'safety-sensitive', 'safe work practices'],
    step: { id: 'osha_10', kind: 'certification', title: 'Complete OSHA 10', estDuration: '~10 hours · online', externalUrl: 'https://www.osha.gov/training' },
    reasonTemplate: 'This {role} appears related to construction or safety-sensitive work; OSHA 10 is the entry-level credential most contractors expect.',
  },
  {
    triggers: ['osha 30', 'construction supervisor', 'lead worker', 'foreman'],
    step: { id: 'osha_30', kind: 'certification', title: 'Complete OSHA 30', estDuration: '~30 hours · online', externalUrl: 'https://www.osha.gov/training' },
    reasonTemplate: 'Lead / supervisory roles in construction commonly require OSHA 30.',
  },
  {
    triggers: ['forklift', 'powered industrial truck', 'order picker', 'pallet jack'],
    step: { id: 'forklift_cert', kind: 'certification', title: 'Complete forklift certification', estDuration: '1 day · in-person', externalUrl: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.178' },
    reasonTemplate: 'This {role} involves forklift / powered industrial truck operation — OSHA-compliant certification is required by federal regulation.',
  },
  {
    triggers: ['cdl', 'commercial driver', 'class a', 'class b', 'tractor trailer', 'truck driver'],
    step: { id: 'cdl', kind: 'license', title: 'Pursue a CDL (Class A or B)', estDuration: '4–8 weeks · accredited school', externalUrl: 'https://www.fmcsa.dot.gov/registration/commercial-drivers-license' },
    reasonTemplate: 'This {role} requires a Commercial Driver License. Many states fund CDL training through workforce programs.',
  },
  {
    triggers: ['servsafe', 'food handler', 'food service', 'kitchen', 'cook'],
    step: { id: 'servsafe', kind: 'certification', title: 'Earn ServSafe / food-handler card', estDuration: '~4 hours · online', externalUrl: 'https://www.servsafe.com/' },
    reasonTemplate: 'Food-service roles typically require a state food-handler card; ServSafe is the most widely accepted credential.',
  },
  {
    triggers: ['nccer', 'electrician', 'plumber apprentice', 'pipefitter', 'welder', 'welding', 'sheet metal', 'carpenter'],
    step: { id: 'nccer_core', kind: 'certification', title: 'Complete NCCER Core', estDuration: '~72 hours · classroom', externalUrl: 'https://www.nccer.org/' },
    reasonTemplate: 'Skilled-trades roles often expect NCCER Core (basic construction skills) before apprenticeship intake.',
  },
  {
    triggers: ['cna', 'caregiver', 'home health aide', 'patient care'],
    step: { id: 'cna', kind: 'certification', title: 'Complete CNA training', estDuration: '4–12 weeks · state-approved program' },
    reasonTemplate: 'Healthcare roles typically require a Certified Nursing Assistant credential; check state licensing rules for any conviction-related disqualifiers.',
  },
  {
    triggers: ['security guard', 'security officer'],
    step: { id: 'security_license', kind: 'license', title: 'Obtain state security guard license', estDuration: '8–40 hours · varies by state' },
    reasonTemplate: 'Security roles require a state-issued license; some states bar applicants with certain felony convictions in the prior 7–10 years.',
  },
  {
    triggers: ['ekg', 'phlebotomist', 'medical assistant'],
    step: { id: 'medical_cred', kind: 'certification', title: 'Complete an allied-health credential', estDuration: '3–9 months', externalUrl: 'https://www.careeronestop.org/Toolkit/Training/find-certifications.aspx' },
    reasonTemplate: 'Allied-health roles need a credential such as MA, EKG tech, or phlebotomist certification.',
  },
];

/**
 * Generic always-on recommendations — applied when the job has any of
 * these characteristics regardless of conviction class. These never
 * displace specific RULES above; they're appended after.
 */
function genericSteps(job: JobInput): TrainingBridgeStep[] {
  const out: TrainingBridgeStep[] = [];
  const text = `${job.title}\n${job.description ?? ''}`.toLowerCase();

  if (/(driver'?s?\s+license|valid (driver|dl)|driving (required|essential))/i.test(text)) {
    out.push({
      id: 'driver_license_review',
      kind: 'document',
      title: 'Verify your driver\u2019s license is in good standing',
      reason: 'The posting requires driving. Pull your driving record and resolve any holds before applying.',
      estDuration: '~30 minutes',
    });
  }

  if (/background (check|investigation|screening)|criminal history check/i.test(text)) {
    out.push({
      id: 'background_statement',
      kind: 'application',
      title: 'Prepare a background explanation statement',
      reason: 'The posting mentions a background check. Having a short, accountable explanation ready prevents surprises during the application or interview.',
      estDuration: '~1 hour',
    });
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Build a Training Bridge for a single (candidate, job) pair.
 * Returns gaps + ordered steps + an optional stepping-stone role.
 */
export function buildTrainingBridge(
  candidate: CandidateProfile,
  job: JobInput,
): TrainingBridge {
  const corpus = `${job.title}\n${job.description ?? ''}`.toLowerCase();
  const userCerts = (candidate.certifications ?? []).map((c) => c.toLowerCase());
  const role = job.title || 'role';

  const steps: TrainingBridgeStep[] = [];
  const gaps: string[] = [];

  for (const rule of RULES) {
    if (!rule.triggers.some((t) => corpus.includes(t))) continue;

    // Skip if user already holds the credential (case-insensitive partial match).
    const idTokens = rule.step.id.replace(/_/g, ' ').split(' ');
    const alreadyHas = userCerts.some((c) =>
      idTokens.some((tok) => tok && c.includes(tok)) || c.includes(rule.step.id.replace(/_/g, ''))
    );
    if (alreadyHas) continue;

    gaps.push(rule.step.title.replace(/^(Complete|Pursue|Earn|Obtain) /, '').toLowerCase());
    steps.push({
      ...rule.step,
      reason: rule.reasonTemplate.replace('{role}', role),
    });
  }

  // Tack on generic recommendations (license + background statement).
  for (const s of genericSteps(job)) {
    if (!steps.some((x) => x.id === s.id)) steps.push(s);
  }

  // Stepping-stone heuristic: if the job mentions both forklift AND
  // experience years, suggest warehouse associate as the bridge.
  const exMatch = job.description?.match(/(\d+)\s*(?:\+|or more)?\s*(?:year|yr)/i);
  const expRequired = exMatch ? Number(exMatch[1]) : 0;
  let steppingStone: TrainingBridge['steppingStone'];
  if (expRequired >= 2 && /forklift|warehouse|logistics/i.test(corpus)) {
    steppingStone = {
      title: 'Warehouse Associate',
      reason: `${role} expects ${expRequired}+ years of experience. Spending 3–6 months as a warehouse associate builds the work history this employer is looking for.`,
    };
  } else if (/(supervisor|lead|foreman|manager)/i.test(job.title.toLowerCase())) {
    steppingStone = {
      title: `Entry-level ${role.replace(/\b(supervisor|lead|foreman|manager)\b/i, '').trim() || 'helper'} role`,
      reason: 'Lead / supervisor titles usually require prior on-the-job time. An entry-level version of the same trade builds that credibility.',
    };
  }

  return { gaps: dedup(gaps), steps, steppingStone };
}

function dedup(items: string[]): string[] {
  return Array.from(new Set(items));
}
