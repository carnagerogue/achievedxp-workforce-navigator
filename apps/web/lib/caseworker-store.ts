'use client';

import { useSyncExternalStore } from 'react';
import type { ConvictionType, UserContextMode, EducationLevel } from '@dxp/shared';
import type { ReadinessAnswers, ReadinessDomainKey, DomainStatus } from './readiness';
import type { SupervisionCondition } from './supervision';

/**
 * Caseload store — saved participants for Caseworker Mode, localStorage-backed
 * (same subscribe/notify pattern as personal-store / checklist-store). Lets a
 * caseworker keep a roster of the people they're helping, reopen each one, and
 * track progress over time instead of re-typing a one-shot form every visit.
 */

export type SupervisionKind = 'none' | 'parole' | 'probation' | 'parole_and_probation';

export type Barrier =
  | 'transportation' | 'housing' | 'id_documents' | 'childcare'
  | 'recovery' | 'food' | 'legal';

export const BARRIER_LABELS: Record<Barrier, string> = {
  transportation: 'Transportation',
  housing: 'Housing instability',
  id_documents: 'ID / documents',
  childcare: 'Childcare',
  recovery: 'Substance use / recovery',
  food: 'Food insecurity',
  legal: 'Legal / record clearing',
};

// ── Action / task engine ──────────────────────────────────────────────────
// A participant's plan is a list of trackable tasks. The status vocabulary
// mirrors checklist-store (planned → contacted → scheduled → completed) so the
// whole app speaks one language for "where is this in the pipeline."

export type TaskStatus = 'planned' | 'contacted' | 'scheduled' | 'completed';
export type TaskCategory =
  | 'application' | 'training' | 'document' | 'barrier' | 'appointment' | 'other';
/** Provenance — which part of the cockpit generated this task. */
export type TaskSource = 'plan' | 'match' | 'barrier' | 'training' | 'dol' | 'manual';

export const TASK_STATUS_ORDER: TaskStatus[] = ['planned', 'contacted', 'scheduled', 'completed'];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Planned',
  contacted: 'Contacted',
  scheduled: 'Scheduled',
  completed: 'Completed',
};
export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  application: 'Application',
  training: 'Training',
  document: 'Document',
  barrier: 'Barrier',
  appointment: 'Appointment',
  other: 'Other',
};

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  category: TaskCategory;
  source: TaskSource;
  /** ISO yyyy-mm-dd. */
  dueDate?: string;
  notes?: string;
  /** Deep-link back to the task's origin so the UI can jump to it. */
  ref?: { jobId?: string; url?: string; stepId?: string };
  /** Readiness domain this step belongs to (drives the merged workspace). */
  domain?: import('./plan-model').PlanDomain;
  createdAt: number;
  completedAt?: number;
}

export type NewTask = Omit<Task, 'id' | 'createdAt' | 'status' | 'completedAt'> &
  Partial<Pick<Task, 'id' | 'status'>>;

export interface Participant {
  id: string;
  name: string;
  conviction: ConvictionType;
  contextMode: UserContextMode;
  supervision: SupervisionKind;
  /** Supervising officer name + next report-to-officer date (for the supervision summary). */
  officerName?: string;
  nextReportDate?: string;
  /** Supervision conditions / check-ins being tracked. */
  conditions?: SupervisionCondition[];
  yearsSinceRelease: number | null;
  education: EducationLevel;
  skills: string[];
  certifications: string[];
  location: string; // ZIP
  careerGoal: string;
  barriers: Barrier[];
  notes: string;
  /** The action plan — trackable tasks with status + due dates. */
  tasks?: Task[];
  /** Manual readiness statuses by domain (overrides auto-derived suggestions). */
  readiness?: ReadinessAnswers;
  /** @deprecated boolean progress map — superseded by `tasks`; kept for migration. */
  progress?: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
}

const KEY = 'dxp.caseload';

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((fn) => fn());

/**
 * Normalize a persisted participant forward to the current shape. Defaults
 * `tasks`, and back-fills it from the legacy boolean `progress` map (one-time)
 * so historical progress is never lost when an older caseload is loaded.
 */
function migrateParticipant(p: Participant): Participant {
  if (Array.isArray(p.tasks)) return p;
  const tasks: Task[] = [];
  if (p.progress) {
    for (const [actionId, done] of Object.entries(p.progress)) {
      if (!done) continue;
      tasks.push({
        id: `legacy:${actionId}`,
        title: actionId,
        status: 'completed',
        category: 'other',
        source: 'plan',
        createdAt: p.createdAt || Date.now(),
        completedAt: p.updatedAt || Date.now(),
      });
    }
  }
  return { ...p, tasks };
}

function read(): Participant[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Participant[]) : [];
    return parsed.map(migrateParticipant);
  } catch { return []; }
}

// Session-only mode: when off, nothing is written to disk — the caseload lives
// only in memory and is gone when the tab closes. Use it on shared / kiosk
// machines so participant PII never persists locally.
let persistEnabled = true;
export function isPersistEnabled(): boolean { return persistEnabled; }
export function setPersistEnabled(on: boolean) {
  persistEnabled = on;
  // Turning session-only ON removes the on-disk copy but keeps the in-memory
  // caseload for this session (reversible — toggling back re-flushes to disk).
  if (typeof window !== 'undefined') {
    try {
      if (on) window.localStorage.setItem(KEY, JSON.stringify(roster));
      else window.localStorage.removeItem(KEY);
    } catch { /* ignore */ }
  }
  emit();
}

function write(v: Participant[]) {
  if (typeof window === 'undefined' || !persistEnabled) return;
  try { window.localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* quota */ }
}

const byRecent = (xs: Participant[]) => [...xs].sort((a, b) => b.updatedAt - a.updatedAt);

let roster: Participant[] = read();
// Cached, stable-reference snapshot — useSyncExternalStore requires the same
// reference when nothing changed, so we only rebuild it on a real mutation.
let snapshot: Participant[] = byRecent(roster);

function commit(next: Participant[]) {
  roster = next;
  snapshot = byRecent(next);
  write(roster);
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY) { roster = read(); snapshot = byRecent(roster); emit(); } });
}
function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }

export function getCaseload(): Participant[] {
  return snapshot;
}
export function getParticipant(id: string): Participant | null {
  return roster.find((p) => p.id === id) ?? null;
}

export function newParticipantId(): string {
  // Deterministic-enough unique id without Date.now collisions in a tight loop.
  return 'p_' + Math.random().toString(36).slice(2, 10) + roster.length.toString(36);
}

export function saveParticipant(p: Participant): Participant {
  const now = Date.now();
  const existing = roster.find((x) => x.id === p.id);
  const merged: Participant = { ...p, createdAt: existing?.createdAt ?? p.createdAt ?? now, updatedAt: now };
  commit(existing ? roster.map((x) => (x.id === p.id ? merged : x)) : [...roster, merged]);
  return merged;
}

export function removeParticipant(id: string) {
  commit(roster.filter((p) => p.id !== id));
}

/** Wipe the entire caseload from both memory and disk. */
export function clearCaseload() {
  roster = [];
  snapshot = [];
  if (typeof window !== 'undefined') { try { window.localStorage.removeItem(KEY); } catch { /* ignore */ } }
  emit();
}

export function setProgress(id: string, actionId: string, done: boolean) {
  commit(roster.map((p) => (p.id === id ? { ...p, progress: { ...(p.progress ?? {}), [actionId]: done }, updatedAt: Date.now() } : p)));
}

// ── Task mutators ─────────────────────────────────────────────────────────
// All route through commit() so snapshot stability, write(), emit() and
// session-only mode keep working unchanged.

export function newTaskId(): string {
  return 't_' + Math.random().toString(36).slice(2, 10);
}

function patchParticipant(id: string, fn: (p: Participant) => Participant) {
  commit(roster.map((p) => (p.id === id ? { ...fn(p), updatedAt: Date.now() } : p)));
}

export function addTask(pid: string, t: NewTask): Task {
  const task: Task = {
    id: t.id ?? newTaskId(),
    title: t.title,
    status: t.status ?? 'planned',
    category: t.category,
    source: t.source,
    dueDate: t.dueDate,
    notes: t.notes,
    ref: t.ref,
    domain: t.domain,
    createdAt: Date.now(),
  };
  patchParticipant(pid, (p) => ({ ...p, tasks: [...(p.tasks ?? []), task] }));
  return task;
}

export function updateTask(pid: string, taskId: string, patch: Partial<Task>) {
  patchParticipant(pid, (p) => ({
    ...p,
    tasks: (p.tasks ?? []).map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
  }));
}

export function setTaskStatus(pid: string, taskId: string, status: TaskStatus) {
  patchParticipant(pid, (p) => ({
    ...p,
    tasks: (p.tasks ?? []).map((t) =>
      t.id === taskId
        ? { ...t, status, completedAt: status === 'completed' ? Date.now() : undefined }
        : t,
    ),
  }));
}

export function removeTask(pid: string, taskId: string) {
  patchParticipant(pid, (p) => ({ ...p, tasks: (p.tasks ?? []).filter((t) => t.id !== taskId) }));
}

export function setReadiness(pid: string, domain: ReadinessDomainKey, status: DomainStatus) {
  patchParticipant(pid, (p) => ({ ...p, readiness: { ...(p.readiness ?? {}), [domain]: status } }));
}

export function setSupervisionMeta(pid: string, patch: { officerName?: string; nextReportDate?: string }) {
  patchParticipant(pid, (p) => ({ ...p, ...patch }));
}

export function addCondition(pid: string, c: SupervisionCondition) {
  patchParticipant(pid, (p) => ({ ...p, conditions: [...(p.conditions ?? []), c] }));
}
export function updateCondition(pid: string, id: string, patch: Partial<SupervisionCondition>) {
  patchParticipant(pid, (p) => ({ ...p, conditions: (p.conditions ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
}
export function removeCondition(pid: string, id: string) {
  patchParticipant(pid, (p) => ({ ...p, conditions: (p.conditions ?? []).filter((c) => c.id !== id) }));
}

/**
 * Idempotently add generated tasks (from matches / barriers / training) by
 * their deterministic id. Never overwrites a task the caseworker already has —
 * so re-scoring or reopening the workspace can't clobber edited status/notes.
 */
export function reconcileGeneratedTasks(pid: string, generated: NewTask[]) {
  patchParticipant(pid, (p) => {
    const existing = new Set((p.tasks ?? []).map((t) => t.id));
    const fresh = generated
      .filter((g) => g.id && !existing.has(g.id))
      .map((g): Task => ({
        id: g.id as string,
        title: g.title,
        status: g.status ?? 'planned',
        category: g.category,
        source: g.source,
        dueDate: g.dueDate,
        notes: g.notes,
        ref: g.ref,
        domain: g.domain,
        createdAt: Date.now(),
      }));
    return fresh.length ? { ...p, tasks: [...(p.tasks ?? []), ...fresh] } : p;
  });
}

const EMPTY: Participant[] = [];
export function useCaseload(): Participant[] {
  return useSyncExternalStore(subscribe, getCaseload, () => EMPTY);
}
export function usePersistEnabled(): boolean {
  return useSyncExternalStore(subscribe, isPersistEnabled, () => true);
}
export function useParticipant(id: string): Participant | null {
  return useSyncExternalStore(
    subscribe,
    () => roster.find((p) => p.id === id) ?? null,
    () => null,
  );
}
