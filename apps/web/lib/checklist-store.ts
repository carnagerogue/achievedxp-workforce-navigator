'use client';

import { useSyncExternalStore } from 'react';

/**
 * Reentry action plan — localStorage-backed, same subscribe/notify pattern as
 * personal-store.ts.
 *
 * This is built to answer the questions a parole/probation officer actually
 * asks: what is the person's plan, where are they in the process for each
 * resource, and what came of it. So each item carries a real status
 * progression (planned → contacted → scheduled → completed), a target /
 * appointment date, and a plan-and-outcome note. The whole plan also carries
 * the person's name and overall goals, and prints to a clean progress report.
 */

export type ChecklistStatus = 'planned' | 'contacted' | 'scheduled' | 'completed';

export interface ChecklistItem {
  /** Stable unique id — prefixed by source so AJC/reentry/service ids never collide. */
  id: string;
  name: string;
  /** 'Job center' | 'Reentry program' | 'Support service' */
  type: string;
  /** The need this addresses (Housing, Health & recovery, …). */
  category?: string;
  address?: string;
  cityState?: string;
  phone?: string;
  url?: string;
  distance?: string;
  status: ChecklistStatus;
  /** ISO yyyy-mm-dd — planned contact / appointment date. */
  targetDate?: string;
  /** Plan, next step, and outcome (e.g. "Intake 3/14 2pm — ask for Maria"). */
  notes?: string;
  addedAt: number;
}

const KEY = 'dxp.checklist';
const NAME_KEY = 'dxp.checklist.name';
const GOALS_KEY = 'dxp.checklist.goals';

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((fn) => fn()); }

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// Map legacy statuses (todo/visited) onto the richer progression.
const STATUS_MIGRATE: Record<string, ChecklistStatus> = {
  todo: 'planned', planned: 'planned',
  contacted: 'contacted', scheduled: 'scheduled',
  visited: 'completed', completed: 'completed',
};
function normalize(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((i) => ({ ...i, status: STATUS_MIGRATE[i.status as string] ?? 'planned' }));
}

// In-memory mirrors so getSnapshot returns stable references.
let items: ChecklistItem[] = normalize(read<ChecklistItem[]>(KEY, []));
let ownerName: string = read<string>(NAME_KEY, '');
let planGoals: string = read<string>(GOALS_KEY, '');

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { items = normalize(read<ChecklistItem[]>(KEY, [])); emit(); }
    else if (e.key === NAME_KEY) { ownerName = read<string>(NAME_KEY, ''); emit(); }
    else if (e.key === GOALS_KEY) { planGoals = read<string>(GOALS_KEY, ''); emit(); }
  });
}

function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }

export function getChecklist(): ChecklistItem[] { return items; }
export function isInChecklist(id: string): boolean { return items.some((i) => i.id === id); }

export function toggleChecklist(item: Omit<ChecklistItem, 'status' | 'addedAt'>): boolean {
  if (isInChecklist(item.id)) {
    items = items.filter((i) => i.id !== item.id);
    write(KEY, items); emit();
    return false;
  }
  items = [...items, { ...item, status: 'planned', addedAt: Date.now() }];
  write(KEY, items); emit();
  return true;
}

export function removeFromChecklist(id: string) {
  items = items.filter((i) => i.id !== id);
  write(KEY, items); emit();
}

function patch(id: string, p: Partial<ChecklistItem>) {
  items = items.map((i) => (i.id === id ? { ...i, ...p } : i));
  write(KEY, items); emit();
}
export function setChecklistStatus(id: string, status: ChecklistStatus) { patch(id, { status }); }
export function setChecklistNotes(id: string, notes: string) { patch(id, { notes }); }
export function setChecklistTargetDate(id: string, targetDate: string) { patch(id, { targetDate }); }

export function clearChecklist() {
  items = [];
  write(KEY, items); emit();
}

export function getOwnerName(): string { return ownerName; }
export function setOwnerName(name: string) { ownerName = name; write(NAME_KEY, name); emit(); }

export function getPlanGoals(): string { return planGoals; }
export function setPlanGoals(goals: string) { planGoals = goals; write(GOALS_KEY, goals); emit(); }

const EMPTY_SERVER: ChecklistItem[] = [];
export function useChecklist(): ChecklistItem[] {
  return useSyncExternalStore(subscribe, getChecklist, () => EMPTY_SERVER);
}
export function useOwnerName(): string {
  return useSyncExternalStore(subscribe, getOwnerName, () => '');
}
export function usePlanGoals(): string {
  return useSyncExternalStore(subscribe, getPlanGoals, () => '');
}
