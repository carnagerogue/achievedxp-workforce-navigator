'use client';

import { useSyncExternalStore } from 'react';
import { lsGet, lsSet, onStoreChange } from './scoped-storage';
import type { ReadinessAnswers, ReadinessDomainKey, DomainStatus } from './readiness';
import type { SupervisionInfo, SupervisionCondition, FeeObligation } from './supervision';
import type { PlanStepStatus } from './plan-model';

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

/** Alias of the canonical 4-step status vocabulary in plan-model.ts. */
export type ChecklistStatus = PlanStepStatus;

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
  /** Set when status becomes completed; powers momentum/streak + report wins. */
  completedAt?: number;
  /** Readiness domain this step belongs to (drives the merged workspace). */
  domain?: import('./plan-model').PlanDomain;
}

/** Lightweight weekly self-check-in — turns the plan into a habit loop. */
export interface CheckIn {
  id: string;
  /** ISO yyyy-mm-dd of the check-in. */
  date: string;
  /** 1–5 self-rating of how the week went. */
  rating: number;
  note: string;
}

const KEY = 'checklist';
const NAME_KEY = 'checklist.name';
const GOALS_KEY = 'checklist.goals';
const CHECKINS_KEY = 'checklist.checkins';
const READINESS_KEY = 'checklist.readiness';
const SUPERVISION_KEY = 'checklist.supervision';
const CONDITIONS_KEY = 'checklist.conditions';
const FEES_KEY = 'checklist.fees';

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((fn) => fn()); }

function read<T>(key: string, fallback: T): T {
  const raw = lsGet(key);
  try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function write<T>(key: string, value: T) { lsSet(key, JSON.stringify(value)); }

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
let checkins: CheckIn[] = read<CheckIn[]>(CHECKINS_KEY, []);
let readiness: ReadinessAnswers = read<ReadinessAnswers>(READINESS_KEY, {});
let supervisionInfo: SupervisionInfo = read<SupervisionInfo>(SUPERVISION_KEY, {});
let conditions: SupervisionCondition[] = read<SupervisionCondition[]>(CONDITIONS_KEY, []);
let fees: FeeObligation[] = read<FeeObligation[]>(FEES_KEY, []);

// Re-read every blob from the active scope on user-switch or cross-tab write —
// this is what makes the plan per-user on a shared device.
onStoreChange(() => {
  items = normalize(read<ChecklistItem[]>(KEY, []));
  ownerName = read<string>(NAME_KEY, '');
  planGoals = read<string>(GOALS_KEY, '');
  checkins = read<CheckIn[]>(CHECKINS_KEY, []);
  readiness = read<ReadinessAnswers>(READINESS_KEY, {});
  supervisionInfo = read<SupervisionInfo>(SUPERVISION_KEY, {});
  conditions = read<SupervisionCondition[]>(CONDITIONS_KEY, []);
  fees = read<FeeObligation[]>(FEES_KEY, []);
  emit();
});

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
export function setChecklistStatus(id: string, status: ChecklistStatus) {
  patch(id, { status, completedAt: status === 'completed' ? Date.now() : undefined });
}
export function setChecklistNotes(id: string, notes: string) { patch(id, { notes }); }
export function setChecklistTargetDate(id: string, targetDate: string) { patch(id, { targetDate }); }

export function clearChecklist() {
  items = [];
  write(KEY, items); emit();
}

/**
 * Load a plan handed over from a caseworker (or another device). 'replace'
 * swaps the whole plan; 'merge' appends items whose id isn't already present.
 */
export function importChecklist(incoming: ChecklistItem[], mode: 'replace' | 'merge' = 'replace') {
  const clean = normalize(incoming);
  if (mode === 'replace') {
    items = clean;
  } else {
    const have = new Set(items.map((i) => i.id));
    items = [...items, ...clean.filter((i) => !have.has(i.id))];
  }
  write(KEY, items); emit();
}

// ── Weekly check-ins ──────────────────────────────────────────────────────
export function getCheckins(): CheckIn[] { return checkins; }
export function addCheckin(c: Omit<CheckIn, 'id'>): CheckIn {
  const entry: CheckIn = { ...c, id: 'ci_' + Math.random().toString(36).slice(2, 9) };
  checkins = [entry, ...checkins];
  write(CHECKINS_KEY, checkins); emit();
  return entry;
}
export function removeCheckin(id: string) {
  checkins = checkins.filter((c) => c.id !== id);
  write(CHECKINS_KEY, checkins); emit();
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
const EMPTY_CHECKINS: CheckIn[] = [];
export function useCheckins(): CheckIn[] {
  return useSyncExternalStore(subscribe, getCheckins, () => EMPTY_CHECKINS);
}

// ── Readiness self-assessment answers ─────────────────────────────────────
export function getReadiness(): ReadinessAnswers { return readiness; }
export function setReadinessAnswer(domain: ReadinessDomainKey, status: DomainStatus) {
  readiness = { ...readiness, [domain]: status };
  write(READINESS_KEY, readiness); emit();
}
const EMPTY_READINESS: ReadinessAnswers = {};
export function useReadiness(): ReadinessAnswers {
  return useSyncExternalStore(subscribe, getReadiness, () => EMPTY_READINESS);
}

// ── Supervision info (officer, type, next report date) ────────────────────
export function getSupervisionInfo(): SupervisionInfo { return supervisionInfo; }
export function setSupervisionInfo(patch: Partial<SupervisionInfo>) {
  supervisionInfo = { ...supervisionInfo, ...patch };
  write(SUPERVISION_KEY, supervisionInfo); emit();
}
const EMPTY_SUPERVISION: SupervisionInfo = {};
export function useSupervisionInfo(): SupervisionInfo {
  return useSyncExternalStore(subscribe, getSupervisionInfo, () => EMPTY_SUPERVISION);
}

// ── Supervision conditions ────────────────────────────────────────────────
export function getConditions(): SupervisionCondition[] { return conditions; }
export function addCondition(c: SupervisionCondition) {
  conditions = [...conditions, c];
  write(CONDITIONS_KEY, conditions); emit();
}
export function updateCondition(id: string, patch: Partial<SupervisionCondition>) {
  conditions = conditions.map((c) => (c.id === id ? { ...c, ...patch } : c));
  write(CONDITIONS_KEY, conditions); emit();
}
export function removeCondition(id: string) {
  conditions = conditions.filter((c) => c.id !== id);
  write(CONDITIONS_KEY, conditions); emit();
}
export function setConditions(list: SupervisionCondition[]) {
  conditions = list;
  write(CONDITIONS_KEY, conditions); emit();
}
const EMPTY_CONDITIONS: SupervisionCondition[] = [];
export function useConditions(): SupervisionCondition[] {
  return useSyncExternalStore(subscribe, getConditions, () => EMPTY_CONDITIONS);
}

// ── Fees / fines / restitution ────────────────────────────────────────────
export function getFees(): FeeObligation[] { return fees; }
export function addFee(o: FeeObligation) {
  fees = [...fees, o];
  write(FEES_KEY, fees); emit();
}
export function updateFee(id: string, patch: Partial<FeeObligation>) {
  fees = fees.map((o) => (o.id === id ? { ...o, ...patch } : o));
  write(FEES_KEY, fees); emit();
}
export function removeFee(id: string) {
  fees = fees.filter((o) => o.id !== id);
  write(FEES_KEY, fees); emit();
}
export function setFees(list: FeeObligation[]) {
  fees = list;
  write(FEES_KEY, fees); emit();
}
const EMPTY_FEES: FeeObligation[] = [];
export function useFees(): FeeObligation[] {
  return useSyncExternalStore(subscribe, getFees, () => EMPTY_FEES);
}
