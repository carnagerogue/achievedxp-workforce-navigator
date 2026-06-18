'use client';

import { useSyncExternalStore } from 'react';
import type { ConvictionType, UserContextMode, EducationLevel } from '@dxp/shared';

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

export interface Participant {
  id: string;
  name: string;
  conviction: ConvictionType;
  contextMode: UserContextMode;
  supervision: SupervisionKind;
  yearsSinceRelease: number | null;
  education: EducationLevel;
  skills: string[];
  certifications: string[];
  location: string; // ZIP
  careerGoal: string;
  barriers: Barrier[];
  notes: string;
  /** Caseworker-checkable progress on plan actions, keyed by action id. */
  progress?: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
}

const KEY = 'dxp.caseload';

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((fn) => fn());

function read(): Participant[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Participant[]) : [];
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

const EMPTY: Participant[] = [];
export function useCaseload(): Participant[] {
  return useSyncExternalStore(subscribe, getCaseload, () => EMPTY);
}
export function usePersistEnabled(): boolean {
  return useSyncExternalStore(subscribe, isPersistEnabled, () => true);
}
