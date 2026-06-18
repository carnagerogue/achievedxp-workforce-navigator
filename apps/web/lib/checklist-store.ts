'use client';

import { useSyncExternalStore } from 'react';

/**
 * Resource checklist — localStorage-backed, same subscribe/notify pattern as
 * personal-store.ts. Unlike saved-jobs (which stores bare IDs), this keeps the
 * full resource record so a justice-impacted user can build a list of local
 * job centers, reentry programs, and support services, track their progress
 * (to contact → contacted → visited), add notes, and print a clean sheet to
 * show a parole/probation officer.
 */

export type ChecklistStatus = 'todo' | 'contacted' | 'visited';

export interface ChecklistItem {
  /** Stable unique id — prefixed by source so AJC/reentry/service ids never collide. */
  id: string;
  name: string;
  /** 'Job center' | 'Reentry program' | 'Support service' */
  type: string;
  category?: string;
  address?: string;
  cityState?: string;
  phone?: string;
  url?: string;
  distance?: string;
  status: ChecklistStatus;
  notes?: string;
  addedAt: number;
}

const KEY = 'dxp.checklist';
const NAME_KEY = 'dxp.checklist.name';

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

// In-memory mirrors so getSnapshot returns stable references.
let items: ChecklistItem[] = read<ChecklistItem[]>(KEY, []);
let ownerName: string = read<string>(NAME_KEY, '');

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { items = read<ChecklistItem[]>(KEY, []); emit(); }
    else if (e.key === NAME_KEY) { ownerName = read<string>(NAME_KEY, ''); emit(); }
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
  items = [...items, { ...item, status: 'todo', addedAt: Date.now() }];
  write(KEY, items); emit();
  return true;
}

export function removeFromChecklist(id: string) {
  items = items.filter((i) => i.id !== id);
  write(KEY, items); emit();
}

export function setChecklistStatus(id: string, status: ChecklistStatus) {
  items = items.map((i) => (i.id === id ? { ...i, status } : i));
  write(KEY, items); emit();
}

export function setChecklistNotes(id: string, notes: string) {
  items = items.map((i) => (i.id === id ? { ...i, notes } : i));
  write(KEY, items); emit();
}

export function clearChecklist() {
  items = [];
  write(KEY, items); emit();
}

export function getOwnerName(): string { return ownerName; }
export function setOwnerName(name: string) {
  ownerName = name;
  write(NAME_KEY, name); emit();
}

const EMPTY_SERVER: ChecklistItem[] = [];
export function useChecklist(): ChecklistItem[] {
  return useSyncExternalStore(subscribe, getChecklist, () => EMPTY_SERVER);
}
export function useOwnerName(): string {
  return useSyncExternalStore(subscribe, getOwnerName, () => '');
}
