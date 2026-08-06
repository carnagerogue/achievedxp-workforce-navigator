/**
 * Employment-readiness / gap-analysis engine. Answers "where is this person now,
 * and what's needed to make them job-ready?" across the real domains of reentry
 * readiness. Pure + isomorphic so both the caseworker (per participant) and the
 * individual (self-assessment) use the same scoring. Auto-derives a suggested
 * status per domain from what we already know; manual answers override it.
 */
import type { Participant, Barrier } from './caseworker-store';
import type { ConvictionType, EducationLevel } from '@dxp/shared';

export type ReadinessDomainKey =
  | 'id_documents' | 'housing' | 'transportation' | 'health_recovery'
  | 'legal_compliance' | 'education' | 'credentials_skills' | 'work_readiness'
  | 'digital_literacy' | 'finances' | 'support_network';

export type DomainStatus = 'ready' | 'in_progress' | 'not_ready' | 'na';
export type ReadinessAnswers = Partial<Record<ReadinessDomainKey, DomainStatus>>;

export interface ReadinessInput {
  conviction?: ConvictionType;
  supervision?: string;            // 'none' | 'parole' | ...
  education?: EducationLevel;
  certifications?: string[];
  barriers?: Barrier[];
  careerGoal?: string;
  /** Credential gaps for the goal (caller computes via the training bridge). */
  trainingGapCount?: number;
  /** Local-help category keys the person has already completed. */
  completedCategories?: string[];
}

export interface GapAction { label: string; taskTitle: string; category: string; url?: string }
export interface DomainResult {
  key: ReadinessDomainKey;
  label: string;
  status: DomainStatus;
  /** True when `status` came from the engine's suggestion, not a manual answer. */
  auto: boolean;
  weight: number;
  whatReady: string;
  gap?: GapAction;
}
export type ReadinessBand = 'early' | 'developing' | 'near-ready' | 'ready';
export interface ReadinessResult {
  score: number;
  band: ReadinessBand;
  domains: DomainResult[];
  gaps: DomainResult[];
}

const FRACTION: Record<DomainStatus, number> = { ready: 1, in_progress: 0.5, not_ready: 0, na: 0 };

const HIGH_BAR_CONVICTIONS = new Set([
  'registry_related', 'violent_offense', 'financial_fraud', 'weapons_related', 'dui_dwi',
]);
const EDU_READY = new Set<EducationLevel>(['high_school_or_ged', 'some_college', 'associate', 'bachelor', 'graduate']);

interface DomainDef {
  key: ReadinessDomainKey;
  label: string;
  weight: number;
  whatReady: string;
  gap: GapAction;
  suggest: (i: ReadinessInput, has: (b: Barrier) => boolean, done: (c: string) => boolean) => DomainStatus;
}

const DOMAINS: DomainDef[] = [
  {
    key: 'id_documents', label: 'ID & documents', weight: 10,
    whatReady: 'Has a valid state ID, Social Security card, and birth certificate.',
    gap: { label: 'Get / replace ID documents', taskTitle: 'Get state ID, SSN card, and birth certificate', category: 'legal', url: '/local-help?tab=community' },
    suggest: (i, has, done) => has('id_documents') ? 'not_ready' : done('legal') ? 'ready' : 'in_progress',
  },
  {
    key: 'housing', label: 'Housing stability', weight: 9,
    whatReady: 'Has stable, reliable housing (not at risk of losing it).',
    gap: { label: 'Stabilize housing', taskTitle: 'Connect with housing assistance', category: 'housing', url: '/resources?need=housing' },
    suggest: (i, has, done) => has('housing') ? 'not_ready' : done('housing') ? 'ready' : 'in_progress',
  },
  {
    key: 'transportation', label: 'Transportation', weight: 9,
    whatReady: 'Has a reliable way to get to work and appointments.',
    gap: { label: 'Arrange reliable transportation', taskTitle: 'Set up transportation help (bus pass / rides)', category: 'transit', url: '/local-help?tab=community' },
    suggest: (i, has, done) => has('transportation') ? 'not_ready' : done('transit') ? 'ready' : 'in_progress',
  },
  {
    key: 'health_recovery', label: 'Health & recovery', weight: 8,
    whatReady: 'Health and any recovery needs are stable and supported.',
    gap: { label: 'Engage recovery / treatment support', taskTitle: 'Connect with treatment & recovery services', category: 'health', url: '/resources?need=health' },
    suggest: (i, has) => has('recovery') ? 'not_ready' : 'na',
  },
  {
    key: 'legal_compliance', label: 'Legal & compliance', weight: 9,
    whatReady: 'Supervision terms are clear and met; record barriers are being addressed.',
    gap: { label: 'Address legal / record barriers', taskTitle: 'Meet legal aid re: record clearing & supervision terms', category: 'legal', url: '/resources?need=legal' },
    suggest: (i, has) => {
      if (has('legal') || (i.conviction && HIGH_BAR_CONVICTIONS.has(i.conviction))) return 'not_ready';
      if (i.supervision && i.supervision !== 'none') return 'in_progress';
      return 'ready';
    },
  },
  {
    key: 'education', label: 'Education', weight: 7,
    whatReady: 'Has a high-school diploma or GED (or higher).',
    gap: { label: 'Earn HS diploma / GED', taskTitle: 'Enroll in GED / adult education', category: 'training', url: '/learn' },
    suggest: (i) => {
      if (!i.education || i.education === 'unknown') return 'in_progress';
      if (i.education === 'less_than_high_school') return 'not_ready';
      return EDU_READY.has(i.education) ? 'ready' : 'in_progress';
    },
  },
  {
    key: 'credentials_skills', label: 'Credentials & skills', weight: 8,
    whatReady: 'Has the credentials and skills the target role requires.',
    gap: { label: 'Close credential gaps for the goal', taskTitle: 'Pursue a credential for the career goal', category: 'training', url: '/apprenticeships' },
    suggest: (i) => {
      if (!i.careerGoal) return 'not_ready';
      if ((i.trainingGapCount ?? 0) > 0) return 'in_progress';
      return (i.certifications?.length ?? 0) > 0 ? 'ready' : 'in_progress';
    },
  },
  {
    key: 'work_readiness', label: 'Work readiness', weight: 8,
    whatReady: 'Has a current résumé, interview practice, and references.',
    gap: { label: 'Build résumé & interview skills', taskTitle: 'Get résumé + interview help at a Job Center', category: 'employment', url: '/local-help?tab=ajc' },
    suggest: () => 'in_progress',
  },
  {
    key: 'digital_literacy', label: 'Digital literacy', weight: 5,
    whatReady: 'Can use email, online applications, and basic computer tasks.',
    gap: { label: 'Build digital skills', taskTitle: 'Take a basic digital-skills class', category: 'training', url: '/learn' },
    suggest: () => 'in_progress',
  },
  {
    key: 'finances', label: 'Finances & benefits', weight: 5,
    whatReady: 'Has a bank account and any benefits they qualify for set up.',
    gap: { label: 'Set up finances & benefits', taskTitle: 'Open a bank account; apply for benefits (SNAP, etc.)', category: 'food', url: '/benefits' },
    suggest: (i, has) => has('food') ? 'not_ready' : 'in_progress',
  },
  {
    key: 'support_network', label: 'Support network', weight: 4,
    whatReady: 'Has people or a group they can rely on for support.',
    gap: { label: 'Strengthen support network', taskTitle: 'Identify a mentor or support group', category: 'family', url: '/dashboard#corner' },
    suggest: () => 'in_progress',
  },
];

export interface ReadinessDomainDef { key: ReadinessDomainKey; label: string; whatReady: string }
/** Ordered, public list of readiness domains for UI iteration/grouping. */
export const READINESS_DOMAINS: ReadinessDomainDef[] = DOMAINS.map((d) => ({ key: d.key, label: d.label, whatReady: d.whatReady }));

export function assessReadiness(input: ReadinessInput, answers: ReadinessAnswers = {}): ReadinessResult {
  const barriers = new Set(input.barriers ?? []);
  const completed = new Set(input.completedCategories ?? []);
  const has = (b: Barrier) => barriers.has(b);
  const done = (c: string) => completed.has(c);

  const domains: DomainResult[] = DOMAINS.map((d) => {
    const suggested = d.suggest(input, has, done);
    const manual = answers[d.key];
    const status = manual ?? suggested;
    return {
      key: d.key, label: d.label, weight: d.weight, whatReady: d.whatReady,
      status, auto: manual == null,
      gap: status === 'ready' || status === 'na' ? undefined : d.gap,
    };
  });

  let wsum = 0, wtot = 0;
  for (const d of domains) {
    if (d.status === 'na') continue;
    wtot += d.weight;
    wsum += d.weight * FRACTION[d.status];
  }
  const score = wtot ? Math.round((wsum / wtot) * 100) : 0;
  const band: ReadinessBand = score >= 85 ? 'ready' : score >= 65 ? 'near-ready' : score >= 40 ? 'developing' : 'early';

  const gaps = domains
    .filter((d) => d.status !== 'ready' && d.status !== 'na')
    .sort((a, b) => b.weight * (1 - FRACTION[b.status]) - a.weight * (1 - FRACTION[a.status]));

  return { score, band, domains, gaps };
}

export const BAND_LABEL: Record<ReadinessBand, string> = {
  early: 'Getting started',
  developing: 'Developing',
  'near-ready': 'Nearly job-ready',
  ready: 'Job-ready',
};

/**
 * Map a plan domain onto the local-help category vocabulary the auto-"ready"
 * suggestions check. Lets a completed step credit its readiness domain even
 * after a handoff import (which rewrites `source`/`notes` but preserves
 * `domain`) — so the readiness score never silently regresses on import.
 */
const DOMAIN_TO_CATEGORY: Record<string, string> = {
  housing: 'housing', transportation: 'transit', health_recovery: 'health',
  legal_compliance: 'legal', id_documents: 'legal',
  credentials_skills: 'training', education: 'training', digital_literacy: 'training',
  work_readiness: 'employment', jobs: 'employment',
  finances: 'food', support_network: 'family',
};

/** Categories a participant has already completed (for the auto "ready" signal). */
function completedCategoriesFromTasks(p: Participant): string[] {
  const out = new Set<string>();
  for (const t of p.tasks ?? []) {
    if (t.status !== 'completed') continue;
    if (t.source === 'barrier' && t.notes) out.add(t.notes);
    if (t.category === 'appointment') out.add('employment');
    if (t.category === 'training') out.add('training');
    // Domain survives the portable-plan handoff; credit it directly so an
    // imported completed step keeps its readiness signal.
    if (t.domain && DOMAIN_TO_CATEGORY[t.domain]) out.add(DOMAIN_TO_CATEGORY[t.domain]);
  }
  return [...out];
}

export function participantToReadinessInput(p: Participant, trainingGapCount = 0): ReadinessInput {
  return {
    conviction: p.conviction,
    supervision: p.supervision,
    education: p.education,
    certifications: p.certifications,
    barriers: p.barriers,
    careerGoal: p.careerGoal,
    trainingGapCount,
    completedCategories: completedCategoriesFromTasks(p),
  };
}

/** Individual self-assessment input — sparse; mostly driven by manual answers. */
export function selfToReadinessInput(opts: { careerGoal?: string; completedCategories?: string[] }): ReadinessInput {
  return { careerGoal: opts.careerGoal, completedCategories: opts.completedCategories };
}
