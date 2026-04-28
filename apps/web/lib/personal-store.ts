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

// ─────────────────────── Wipe everything ───────────────────────

/**
 * Every localStorage key this app may have written. Kept in one place so
 * the "Clear my data" affordance and the idle-wipe sweep both stay in
 * sync as we add new persisted state. Includes the caseworker plan blob
 * (PII-bearing — name, conviction class, free-text notes) and the
 * privacy-notice acknowledgement flag.
 */
const ALL_DXP_KEYS = [
  SAVED_KEY,
  APPS_KEY,
  RECENT_KEY,
  COMPARE_KEY,
  'dxp.userId',                  // legacy session id (post-auth: cookie holds session)
  'dxp:caseworker:plan',         // see apps/web/app/caseworker/page.tsx
  'dxp.privacyNoticeAcknowledged',
  'dxp.lastInteractionAt',
];

/**
 * Clear every DXP-owned localStorage key and reset in-memory mirrors.
 * Used by the header "Clear my data" button and by the idle-wipe sweep.
 *
 * Returns silently on the server. Caller is responsible for any router
 * navigation (e.g. redirecting to /onboarding) that should follow.
 */
export function clearAllPersonalData() {
  if (typeof window === 'undefined') return;
  for (const key of ALL_DXP_KEYS) {
    try { window.localStorage.removeItem(key); } catch { /* ignore quota / private-mode */ }
  }
  mirror.saved = [];
  mirror.recent = [];
  mirror.compare = [];
  mirror.applications = {};
  emit();
}

// ─────────────────────── Idle-wipe ───────────────────────

const IDLE_WIPE_MS = 4 * 60 * 60 * 1000;       // 4h — long enough for a session, short enough for a kiosk
const IDLE_TICK_KEY = 'dxp.lastInteractionAt';

/** Refresh the idle clock. Cheap — used as a passive listener target. */
function touch() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(IDLE_TICK_KEY, String(Date.now())); } catch { /* ignore */ }
}

/**
 * Initialise the idle-wipe behavior. Mount once at the app root.
 *
 * On mount: if more than IDLE_WIPE_MS has elapsed since the last
 * recorded interaction, wipe everything before the page hydrates with
 * stale data. Then attach passive listeners to refresh the clock on
 * pointer / keyboard activity.
 *
 * Why localStorage rather than sessionStorage: localStorage survives
 * tab close, which is exactly what we want — a user closing their tab
 * on a library computer and walking away should still trigger the wipe
 * the next time someone opens the site there.
 */
export function initIdleWipe() {
  if (typeof window === 'undefined') return () => {};
  // Stale-on-arrival check
  try {
    const last = Number(window.localStorage.getItem(IDLE_TICK_KEY) ?? 0);
    if (last > 0 && Date.now() - last > IDLE_WIPE_MS) {
      clearAllPersonalData();
    }
  } catch { /* ignore */ }
  touch();

  // pointerdown / keydown live on window; visibilitychange lives on
  // document — wire them separately so TS keeps the right element types.
  const winEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown'];
  for (const e of winEvents) window.addEventListener(e, touch, { passive: true });
  document.addEventListener('visibilitychange', touch, { passive: true });
  // Periodic check while the tab is open — handles "user walked away
  // mid-session" without us having to bind a setTimeout per event.
  const interval = window.setInterval(() => {
    try {
      const last = Number(window.localStorage.getItem(IDLE_TICK_KEY) ?? 0);
      if (last > 0 && Date.now() - last > IDLE_WIPE_MS) {
        clearAllPersonalData();
      }
    } catch { /* ignore */ }
  }, 60_000);
  return () => {
    for (const e of winEvents) window.removeEventListener(e, touch);
    document.removeEventListener('visibilitychange', touch);
    window.clearInterval(interval);
  };
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
