/**
 * Unified plan model — the store-agnostic shape that merges Readiness ("where
 * you are" per domain) and the action plan ("what you're doing about it") into
 * one domain-organized workspace shared by the individual and the caseworker.
 * Both sides build a PlanModel from their own store; PlanWorkspace renders it.
 */
import type {
  ReadinessDomainKey, DomainStatus, DomainResult, ReadinessResult,
} from './readiness';
import type { CheckIn } from './checklist-store';
import type { SupervisionInfo, SupervisionCondition, ConditionType, ConditionCadence, FeeObligation, FeeKind } from './supervision';

export type PlanDomain = ReadinessDomainKey | 'jobs' | 'general';
export type PlanStepStatus = 'planned' | 'contacted' | 'scheduled' | 'completed';

export interface PlanStep {
  id: string;
  title: string;
  status: PlanStepStatus;
  domain: PlanDomain;
  dueDate?: string;
  notes?: string;
  url?: string;
  jobId?: string;
  source?: string;
}

export interface PlanModel {
  ownerName: string;
  ownerIdentity?: { displayName: string; imageUrl?: string };
  goals: string;
  readiness: ReadinessResult;
  steps: PlanStep[];
  checkins?: CheckIn[];
  supervision?: SupervisionInfo;
  conditions?: SupervisionCondition[];
  fees?: FeeObligation[];
  isCaseworker: boolean;
}

export interface NewCondition { type: ConditionType; label: string; cadence: ConditionCadence; dueDate?: string }
export interface NewFee { kind: FeeKind; label: string; total: number; dueDate?: string }

export interface PlanActions {
  setDomainStatus: (d: ReadinessDomainKey, s: DomainStatus) => void;
  addStep: (domain: PlanDomain, title: string) => void;
  addGapStep: (gap: DomainResult) => void;
  setStepStatus: (id: string, s: PlanStepStatus) => void;
  setStepDue: (id: string, date: string) => void;
  setStepNotes: (id: string, notes: string) => void;
  removeStep: (id: string) => void;
  setOwnerName?: (v: string) => void;
  setGoals?: (v: string) => void;
  addCheckin?: (rating: number, note: string) => void;
  removeCheckin?: (id: string) => void;
  setSupervision?: (patch: Partial<SupervisionInfo>) => void;
  addCondition?: (c: NewCondition) => void;
  markConditionMet?: (id: string) => void;
  setConditionDue?: (id: string, date: string) => void;
  removeCondition?: (id: string) => void;
  addFee?: (f: NewFee) => void;
  logPayment?: (feeId: string, amount: number, date: string, note?: string) => void;
  removePayment?: (feeId: string, paymentId: string) => void;
  setFeeDue?: (feeId: string, date: string) => void;
  setFeeTotal?: (feeId: string, total: number) => void;
  removeFee?: (feeId: string) => void;
  onSupervisionSummary?: () => void;
  onShare?: () => void;
  onImport?: () => void;
  onPrint?: () => void;
}

export const PLAN_BUCKETS: { key: 'jobs' | 'general'; label: string; whatReady: string }[] = [
  { key: 'jobs', label: 'Jobs & applications', whatReady: 'Roles you’re pursuing and applications in flight.' },
  { key: 'general', label: 'General steps', whatReady: 'Anything else on your plan.' },
];

const ALL_DOMAINS = new Set<string>([
  'id_documents', 'housing', 'transportation', 'health_recovery', 'legal_compliance',
  'education', 'credentials_skills', 'work_readiness', 'digital_literacy', 'finances', 'support_network',
]);

/** Map a resource/category string onto a readiness domain. */
function categoryToDomain(raw?: string): PlanDomain | null {
  const v = (raw || '').toLowerCase();
  if (!v) return null;
  if (ALL_DOMAINS.has(v)) return v as PlanDomain;
  if (/hous|shelter/.test(v)) return 'housing';
  if (/transport|transit/.test(v)) return 'transportation';
  if (/health|recov|treatment/.test(v)) return 'health_recovery';
  if (/\bid\b|document|record clear|expung/.test(v)) return 'id_documents';
  if (/legal|compliance|supervis|parole|probation/.test(v)) return 'legal_compliance';
  if (/food|benefit|financ|money/.test(v)) return 'finances';
  if (/child|family/.test(v)) return 'support_network';
  if (/train|credential|cert|educ|skill/.test(v)) return 'credentials_skills';
  if (/job|employ|appointment|résumé|resume|interview/.test(v)) return 'jobs';
  return null;
}

/**
 * Resolve a step's domain. Honors an explicit `domain`, then a deterministic id
 * prefix (`readiness:<d>`, `barrier:`, `match:`, `train:`, `dol-`), then the
 * category/source, else 'general'. Keeps older steps (no domain) grouped right.
 */
export function deriveStepDomain(s: {
  id?: string; domain?: PlanDomain | string; source?: string; category?: string;
  ref?: { jobId?: string; url?: string }; notes?: string; type?: string;
}): PlanDomain {
  if (s.domain && (ALL_DOMAINS.has(s.domain) || s.domain === 'jobs' || s.domain === 'general')) {
    return s.domain as PlanDomain;
  }
  const id = s.id || '';
  if (id.startsWith('readiness:')) {
    const d = id.slice('readiness:'.length);
    if (ALL_DOMAINS.has(d)) return d as PlanDomain;
  }
  if (id.startsWith('match:') || s.source === 'match') return 'jobs';
  if (id.startsWith('train:') || s.source === 'training') return 'credentials_skills';
  if (id.startsWith('dol-') || s.source === 'dol') return 'work_readiness';
  // barrier tasks store their category in notes; resources use category/type.
  const byCat = categoryToDomain(s.category) || categoryToDomain(s.notes) || categoryToDomain(s.type);
  if (byCat) return byCat;
  if (s.source === 'manual' || s.source === 'plan') return 'general';
  return 'general';
}

export const stepDomainCounts = (steps: PlanStep[]) => {
  const total = new Map<PlanDomain, number>();
  const done = new Map<PlanDomain, number>();
  for (const s of steps) {
    total.set(s.domain, (total.get(s.domain) ?? 0) + 1);
    if (s.status === 'completed') done.set(s.domain, (done.get(s.domain) ?? 0) + 1);
  }
  return { total, done };
};
