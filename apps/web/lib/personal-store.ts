'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Lightweight localStorage-backed store with a subscribe/notify pattern.
 *
 * ─── Why the cached snapshots below ───
 * `useSyncExternalStore` requires `getSnapshot` to return the SAME reference
 * when the underlying data hasn't changed. Returning a fresh JSON.parse
 * result every render makes React think the value mutated, which triggers
 * another render, which calls getSnapshot again, which returns yet another
 * new array — infinite loop ("Maximum update depth exceeded").
 *
 * The fix: keep in-memory mirrors of each stored blob. We update the
 * mirror (and emit) only when a mutation happens or when the native
 * `storage` event fires (cross-tab). Components read the mirror directly,
 * so references stay stable between renders.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() { listeners.forEach((fn) => fn()); }

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded → drop silently; Phase 8 swaps to server-side.
  }
}

// ────────────── In-memory mirrors (stable references for React) ──────────────

interface Mirror {
  saved: string[];
  recent: string[];
  compare: string[];
  applications: Record<string, ApplicationRecord>;
}

const SAVED_KEY = 'dxp.saved';
const APPS_KEY  = 'dxp.applications';
const RECENT_KEY = 'dxp.recent';
const COMPARE_KEY = 'dxp.compare';
const RECENT_CAP = 12;
const COMPARE_CAP = 3;

const mirror: Mirror = {
  saved:   readJson<string[]>(SAVED_KEY, []),
  recent:  readJson<string[]>(RECENT_KEY, []),
  compare: readJson<string[]>(COMPARE_KEY, []),
  applications: readJson<Record<string, ApplicationRecord>>(APPS_KEY, {}),
};

// Keep in sync across tabs (and refresh our mirror in the current tab).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SAVED_KEY)        mirror.saved   = readJson(SAVED_KEY, []);
    else if (e.key === RECENT_KEY)  mirror.recent  = readJson(RECENT_KEY, []);
    else if (e.key === COMPARE_KEY) mirror.compare = readJson(COMPARE_KEY, []);
    else if (e.key === APPS_KEY)    mirror.applications = readJson(APPS_KEY, {});
    else return;
    emit();
  });
}

// ─────────────────────── Saved jobs ───────────────────────

export function getSavedJobIds(): string[]   { return mirror.saved; }
export function isSaved(id: string): boolean { return mirror.saved.includes(id); }
export function toggleSaved(id: string): boolean {
  const ids = mirror.saved;
  mirror.saved = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids];
  writeJson(SAVED_KEY, mirror.saved);
  emit();
  return mirror.saved.includes(id);
}
export function removeSaved(id: string) {
  mirror.saved = mirror.saved.filter((x) => x !== id);
  writeJson(SAVED_KEY, mirror.saved);
  emit();
}

// ─────────────────────── Application tracking ───────────────────────

export type ApplicationStatus =
  | 'APPLIED'
  | 'INTERVIEWING'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDREW';

export interface ApplicationRecord {
  jobId: string;
  status: ApplicationStatus;
  updatedAt: number;
}

export function getApplications(): Record<string, ApplicationRecord> {
  return mirror.applications;
}
export function getApplication(id: string): ApplicationRecord | null {
  return mirror.applications[id] ?? null;
}
export function setApplicationStatus(id: string, status: ApplicationStatus | null) {
  const next = { ...mirror.applications };
  if (status === null) delete next[id];
  else next[id] = { jobId: id, status, updatedAt: Date.now() };
  mirror.applications = next;
  writeJson(APPS_KEY, next);
  emit();
}

// ─────────────────────── Recently viewed ───────────────────────

export function getRecentJobIds(): string[] { return mirror.recent; }
export function pushRecent(id: string) {
  const prev = mirror.recent.filter((x) => x !== id);
  const next = [id, ...prev].slice(0, RECENT_CAP);
  // Only emit/write if something actually changed — critical for the
  // effect-driven `useTrackRecentView` call, which otherwise would push
  // the same id repeatedly and re-render every consumer.
  if (next.length === mirror.recent.length && next.every((x, i) => x === mirror.recent[i])) {
    return;
  }
  mirror.recent = next;
  writeJson(RECENT_KEY, next);
  emit();
}

// ─────────────────────── Compare set ───────────────────────

export function getCompareIds(): string[] { return mirror.compare; }
export function isInCompare(id: string): boolean { return mirror.compare.includes(id); }
export function toggleCompare(id: string): { isIn: boolean; full: boolean } {
  const prev = mirror.compare;
  if (prev.includes(id)) {
    mirror.compare = prev.filter((x) => x !== id);
    writeJson(COMPARE_KEY, mirror.compare);
    emit();
    return { isIn: false, full: false };
  }
  if (prev.length >= COMPARE_CAP) return { isIn: false, full: true };
  mirror.compare = [...prev, id];
  writeJson(COMPARE_KEY, mirror.compare);
  emit();
  return { isIn: true, full: false };
}
export function clearCompare() {
  if (mirror.compare.length === 0) return;
  mirror.compare = [];
  writeJson(COMPARE_KEY, mirror.compare);
  emit();
}

// ─────────────────────── React hooks ───────────────────────

function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// Server snapshots are constant empty values — stable identity for SSR.
const EMPTY_ARR: string[] = [];
const EMPTY_OBJ: Record<string, ApplicationRecord> = {};
const serverArr = () => EMPTY_ARR;
const serverObj = () => EMPTY_OBJ;

// Each getSnapshot returns the MIRROR (stable reference until mutation).
export function useSavedJobIds(): string[] {
  return useSyncExternalStore(subscribe, getSavedJobIds, serverArr);
}
export function useRecentJobIds(): string[] {
  return useSyncExternalStore(subscribe, getRecentJobIds, serverArr);
}
export function useCompareIds(): string[] {
  return useSyncExternalStore(subscribe, getCompareIds, serverArr);
}
export function useApplications(): Record<string, ApplicationRecord> {
  return useSyncExternalStore(subscribe, getApplications, serverObj);
}

/** Track a job visit — call from the detail page after the job loads. */
export function useTrackRecentView(id: string | null | undefined) {
  useEffect(() => {
    if (id) pushRecent(id);
  }, [id]);
}
