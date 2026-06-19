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
  type Participant, type Task, type TaskCategory,
} from './caseworker-store';

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
}

export interface PortablePlan {
  v: 1;
  kind: 'reentry-plan';
  exportedAt: string;
  person: { name: string; goals: string };
  items: PortableItem[];
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
export function checklistToPortable(items: ChecklistItem[], name: string, goals: string): PortablePlan {
  return {
    v: 1, kind: 'reentry-plan', exportedAt: new Date().toISOString(),
    person: { name, goals },
    items: items.map((i) => ({
      name: i.name, type: i.type, category: i.category, status: i.status,
      targetDate: i.targetDate, notes: i.notes,
      address: i.address, cityState: i.cityState, phone: i.phone, url: i.url,
    })),
  };
}

export function portableToChecklist(p: PortablePlan): ChecklistItem[] {
  return p.items.map((it, idx) => ({
    id: `import:${idx}:${(it.name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`,
    name: it.name, type: it.type || 'Support service', category: it.category,
    address: it.address, cityState: it.cityState, phone: it.phone, url: it.url,
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
  return {
    v: 1, kind: 'reentry-plan', exportedAt: new Date().toISOString(),
    person: { name: p.name, goals: p.careerGoal },
    items: (p.tasks ?? []).map((t) => ({
      name: t.title, type: t.category, category: t.category, status: t.status,
      targetDate: t.dueDate, notes: t.notes, url: t.ref?.url,
    })),
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
    ref: it.url ? { url: it.url } : undefined,
    createdAt: now,
    completedAt: it.status === 'completed' ? now : undefined,
  }));
  return {
    id: newParticipantId(),
    name: p.person.name || 'Imported participant',
    conviction: 'other',
    contextMode: 'recently_released',
    supervision: 'none',
    yearsSinceRelease: null,
    education: 'unknown',
    skills: [],
    certifications: [],
    location: '',
    careerGoal: p.person.goals || '',
    barriers: [],
    notes: 'Imported from a participant-built plan.',
    tasks,
    createdAt: now,
    updatedAt: now,
  };
}

export function planFilename(name: string): string {
  const slug = (name || 'reentry-plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'reentry'}-plan.json`;
}
