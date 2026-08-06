/**
 * Portable plan format — the bridge between the individual's self-service plan
 * (checklist-store) and a caseworker's participant (caseworker-store). Both
 * sides export and import the same versioned JSON, so a person can build a plan
 * and hand it to their caseworker/PO, and a caseworker can hand one back — all
 * browser-local, no accounts (transferred as a downloadable file or a copyable
 * code).
 */
import type { ChecklistItem, ChecklistStatus } from './checklist-store';
import {
  newParticipantId, newTaskId,
  type Participant, type Task, type TaskCategory, type Barrier, type SupervisionKind,
} from './caseworker-store';
import type { ConvictionType, EducationLevel, UserContextMode } from '@dxp/shared';
import {
  assessReadiness, participantToReadinessInput, selfToReadinessInput,
  type ReadinessAnswers,
} from './readiness';
import type { SupervisionInfo, SupervisionCondition, FeeObligation } from './supervision';

export interface PortableItem {
  /**
   * Original item/task id (v2). Deterministic prefixes (match:/train:/barrier:/
   * dol-ajc:/readiness:) travel with the plan so a re-import reuses the same id
   * and reconcileGeneratedTasks() stays idempotent instead of duplicating.
   */
  id?: string;
  name: string;
  type?: string;
  category?: string;
  status: ChecklistStatus;
  targetDate?: string;
  notes?: string;
  address?: string;
  cityState?: string;
  phone?: string;
  url?: string;
  /** Deep-link back to the task's origin (v2) — mirrors Task.ref. */
  ref?: { jobId?: string; url?: string; stepId?: string };
  domain?: import('./plan-model').PlanDomain;
}

export interface PortableProfile {
  conviction?: ConvictionType;
  supervision?: string;
  education?: EducationLevel;
  certifications?: string[];
  barriers?: Barrier[];
  /** ZIP (v2). */
  location?: string;
  /** v2. */
  skills?: string[];
  /** v2. */
  yearsSinceRelease?: number | null;
  /** v2. */
  contextMode?: UserContextMode;
  /** Caseworker notes (v2) — so a round-trip doesn't overwrite them. */
  notes?: string;
}

export interface PortablePlan {
  /** 2 on export; v1 payloads (missing v2 fields) are still accepted on read. */
  v: 1 | 2;
  kind: 'reentry-plan';
  exportedAt: string;
  person: { name: string; goals: string };
  items: PortableItem[];
  /** Profile snapshot so the receiving side can re-derive readiness accurately. */
  profile?: PortableProfile;
  /** Manual readiness answers (domain → status). */
  readiness?: ReadinessAnswers;
  /** Informational readiness score at export time (for share/import preview). */
  readinessScore?: number;
  /** Supervising officer + next report date, so it travels with a shared plan. */
  supervision?: SupervisionInfo;
  /** Supervision conditions / check-ins. */
  conditions?: SupervisionCondition[];
  /** Fees / fines / restitution being tracked. */
  fees?: FeeObligation[];
}

// ── encode / decode (URL-safe base64 of JSON, unicode-safe) ───────────────
export function encodePlan(p: PortablePlan): string {
  const json = JSON.stringify(p);
  const b64 = typeof window === 'undefined'
    ? Buffer.from(json, 'utf8').toString('base64')
    : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePlan(code: string): PortablePlan {
  const b64 = code.trim().replace(/-/g, '+').replace(/_/g, '/');
  const json = typeof window === 'undefined'
    ? Buffer.from(b64, 'base64').toString('utf8')
    : decodeURIComponent(escape(atob(b64)));
  return validate(JSON.parse(json));
}

function validate(o: unknown): PortablePlan {
  const p = o as PortablePlan;
  if (!p || p.kind !== 'reentry-plan' || !Array.isArray(p.items)) {
    throw new Error('Not a valid Achieve DXP plan file.');
  }
  return p;
}

/** Accept either raw JSON (from a file) or a pasted code. */
export function parsePlanText(text: string): PortablePlan {
  const t = text.trim();
  if (t.startsWith('{')) return validate(JSON.parse(t));
  return decodePlan(t);
}

export function downloadPlan(p: PortablePlan, filename = 'reentry-plan.json') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── checklist (individual) ↔ portable ─────────────────────────────────────
export function checklistToPortable(
  items: ChecklistItem[], name: string, goals: string,
  readiness: ReadinessAnswers = {}, supervision?: SupervisionInfo, conditions?: SupervisionCondition[],
  fees?: FeeObligation[],
): PortablePlan {
  const readinessScore = assessReadiness(selfToReadinessInput({ careerGoal: goals }), readiness).score;
  return {
    v: 2, kind: 'reentry-plan', exportedAt: new Date().toISOString(),
    person: { name, goals },
    items: items.map((i) => ({
      id: i.id, name: i.name, type: i.type, category: i.category, status: i.status,
      targetDate: i.targetDate, notes: i.notes,
      address: i.address, cityState: i.cityState, phone: i.phone, url: i.url, domain: i.domain,
    })),
    readiness,
    readinessScore,
    supervision,
    conditions,
    fees,
  };
}

export function portableToChecklist(p: PortablePlan): ChecklistItem[] {
  return p.items.map((it, idx) => ({
    // Reuse the carried id (v2) so deterministic ids survive the round trip
    // and 'merge' imports don't duplicate; mint one only for v1 payloads.
    id: it.id || `import:${idx}:${(it.name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`,
    name: it.name, type: it.type || 'Support service', category: it.category,
    address: it.address, cityState: it.cityState, phone: it.phone,
    url: it.url ?? it.ref?.url, domain: it.domain,
    status: it.status || 'planned', targetDate: it.targetDate, notes: it.notes,
    addedAt: Date.now() + idx,
    completedAt: it.status === 'completed' ? Date.now() : undefined,
  }));
}

// ── participant (caseworker) ↔ portable ───────────────────────────────────
const CATEGORY_FROM_TYPE = (s?: string): TaskCategory => {
  const v = (s || '').toLowerCase();
  if (/job center|reentry|appointment/.test(v)) return 'appointment';
  if (/housing|food|transport|recovery|legal|childcare|barrier|support/.test(v)) return 'barrier';
  return 'other';
};

export function participantToPortable(p: Participant): PortablePlan {
  const readinessScore = assessReadiness(participantToReadinessInput(p), p.readiness ?? {}).score;
  return {
    v: 2, kind: 'reentry-plan', exportedAt: new Date().toISOString(),
    person: { name: p.name, goals: p.careerGoal },
    items: (p.tasks ?? []).map((t) => ({
      id: t.id, name: t.title, type: t.category, category: t.category, status: t.status,
      targetDate: t.dueDate, notes: t.notes, url: t.ref?.url, ref: t.ref, domain: t.domain,
    })),
    profile: {
      conviction: p.conviction, supervision: p.supervision, education: p.education,
      certifications: p.certifications, barriers: p.barriers,
      location: p.location, skills: p.skills, yearsSinceRelease: p.yearsSinceRelease,
      contextMode: p.contextMode, notes: p.notes,
    },
    readiness: p.readiness,
    readinessScore,
    supervision: {
      officerName: p.officerName,
      supervisionType: p.supervision === 'probation' ? 'probation' : p.supervision === 'none' ? 'none' : 'parole',
      nextReportDate: p.nextReportDate,
    },
    conditions: p.conditions,
    fees: p.fees,
  };
}

export function portableToParticipant(p: PortablePlan): Participant {
  const now = Date.now();
  const tasks: Task[] = p.items.map((it) => ({
    // Reuse the carried id (v2) so deterministic ids (match:/train:/…) survive
    // and reconcileGeneratedTasks() won't re-add them; mint one only for v1.
    id: it.id || newTaskId(),
    title: it.name,
    status: it.status || 'planned',
    category: CATEGORY_FROM_TYPE(it.type || it.category),
    source: 'plan',
    dueDate: it.targetDate,
    notes: it.notes,
    domain: it.domain,
    ref: it.ref ?? (it.url ? { url: it.url } : undefined),
    createdAt: now,
    completedAt: it.status === 'completed' ? now : undefined,
  }));
  const prof = p.profile ?? {};
  const sup = p.supervision ?? {};
  // Prefer the full-fidelity profile field — the portable `supervisionType` only
  // has 3 values and would otherwise collapse `parole_and_probation` to `parole`.
  const VALID_KINDS: SupervisionKind[] = ['none', 'parole', 'probation', 'parole_and_probation'];
  const profKind = VALID_KINDS.includes(prof.supervision as SupervisionKind) ? (prof.supervision as SupervisionKind) : undefined;
  const supervisionKind: SupervisionKind =
    profKind
    ?? (sup.supervisionType === 'parole' ? 'parole'
      : sup.supervisionType === 'probation' ? 'probation'
      : 'none');
  const VALID_MODES: UserContextMode[] = [
    'currently_incarcerated', 'preparing_for_release', 'recently_released', 'in_the_community', 'on_supervision',
  ];
  const contextMode: UserContextMode =
    VALID_MODES.includes(prof.contextMode as UserContextMode) ? (prof.contextMode as UserContextMode) : 'recently_released';
  return {
    id: newParticipantId(),
    name: p.person.name || 'Imported participant',
    conviction: prof.conviction ?? 'other',
    contextMode,
    supervision: supervisionKind,
    officerName: sup.officerName,
    nextReportDate: sup.nextReportDate,
    yearsSinceRelease: prof.yearsSinceRelease ?? null,
    education: prof.education ?? 'unknown',
    skills: prof.skills ?? [],
    certifications: prof.certifications ?? [],
    location: prof.location ?? '',
    careerGoal: p.person.goals || '',
    barriers: prof.barriers ?? [],
    notes: prof.notes ?? 'Imported from a participant-built plan.',
    tasks,
    readiness: p.readiness,
    conditions: p.conditions,
    fees: p.fees,
    createdAt: now,
    updatedAt: now,
  };
}

export function planFilename(name: string): string {
  const slug = (name || 'reentry-plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'reentry'}-plan.json`;
}
