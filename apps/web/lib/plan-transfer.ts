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
import type { ConvictionType, EducationLevel } from '@dxp/shared';
import {
  assessReadiness, participantToReadinessInput, selfToReadinessInput,
  type ReadinessAnswers,
} from './readiness';
import type { SupervisionInfo, SupervisionCondition } from './supervision';

export interface PortableItem {
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
  domain?: import('./plan-model').PlanDomain;
}

export interface PortableProfile {
  conviction?: ConvictionType;
  supervision?: string;
  education?: EducationLevel;
  certifications?: string[];
  barriers?: Barrier[];
}

export interface PortablePlan {
  v: 1;
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
): PortablePlan {
  const readinessScore = assessReadiness(selfToReadinessInput({ careerGoal: goals }), readiness).score;
  return {
    v: 1, kind: 'reentry-plan', exportedAt: new Date().toISOString(),
    person: { name, goals },
    items: items.map((i) => ({
      name: i.name, type: i.type, category: i.category, status: i.status,
      targetDate: i.targetDate, notes: i.notes,
      address: i.address, cityState: i.cityState, phone: i.phone, url: i.url, domain: i.domain,
    })),
    readiness,
    readinessScore,
    supervision,
    conditions,
  };
}

export function portableToChecklist(p: PortablePlan): ChecklistItem[] {
  return p.items.map((it, idx) => ({
    id: `import:${idx}:${(it.name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`,
    name: it.name, type: it.type || 'Support service', category: it.category,
    address: it.address, cityState: it.cityState, phone: it.phone, url: it.url, domain: it.domain,
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
    v: 1, kind: 'reentry-plan', exportedAt: new Date().toISOString(),
    person: { name: p.name, goals: p.careerGoal },
    items: (p.tasks ?? []).map((t) => ({
      name: t.title, type: t.category, category: t.category, status: t.status,
      targetDate: t.dueDate, notes: t.notes, url: t.ref?.url, domain: t.domain,
    })),
    profile: {
      conviction: p.conviction, supervision: p.supervision, education: p.education,
      certifications: p.certifications, barriers: p.barriers,
    },
    readiness: p.readiness,
    readinessScore,
    supervision: {
      officerName: p.officerName,
      supervisionType: p.supervision === 'probation' ? 'probation' : p.supervision === 'none' ? 'none' : 'parole',
      nextReportDate: p.nextReportDate,
    },
    conditions: p.conditions,
  };
}

export function portableToParticipant(p: PortablePlan): Participant {
  const now = Date.now();
  const tasks: Task[] = p.items.map((it) => ({
    id: newTaskId(),
    title: it.name,
    status: it.status || 'planned',
    category: CATEGORY_FROM_TYPE(it.type || it.category),
    source: 'plan',
    dueDate: it.targetDate,
    notes: it.notes,
    domain: it.domain,
    ref: it.url ? { url: it.url } : undefined,
    createdAt: now,
    completedAt: it.status === 'completed' ? now : undefined,
  }));
  const prof = p.profile ?? {};
  const sup = p.supervision ?? {};
  const supervisionKind: SupervisionKind =
    sup.supervisionType === 'parole' ? 'parole'
    : sup.supervisionType === 'probation' ? 'probation'
    : (prof.supervision as SupervisionKind) ?? 'none';
  return {
    id: newParticipantId(),
    name: p.person.name || 'Imported participant',
    conviction: prof.conviction ?? 'other',
    contextMode: 'recently_released',
    supervision: supervisionKind,
    officerName: sup.officerName,
    nextReportDate: sup.nextReportDate,
    yearsSinceRelease: null,
    education: prof.education ?? 'unknown',
    skills: [],
    certifications: prof.certifications ?? [],
    location: '',
    careerGoal: p.person.goals || '',
    barriers: prof.barriers ?? [],
    notes: 'Imported from a participant-built plan.',
    tasks,
    readiness: p.readiness,
    conditions: p.conditions,
    createdAt: now,
    updatedAt: now,
  };
}

export function planFilename(name: string): string {
  const slug = (name || 'reentry-plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'reentry'}-plan.json`;
}
