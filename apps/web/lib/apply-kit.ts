'use client';

import { useSyncExternalStore } from 'react';
import { lsGet, lsSet, onStoreChange } from './scoped-storage';

/**
 * The Apply Kit — one reusable "application profile" a person fills once and
 * uses everywhere. This is the heart of the "one account, apply anywhere"
 * idea: instead of retyping the same answers into every employer's form, the
 * kit holds them ready to copy, and the apply flow surfaces it beside the
 * real posting.
 *
 * Tuned to what fair-chance applications actually ask (warehouse / trades /
 * food service / retail): shifts, start date, transportation, a short pitch,
 * references, and the background statement they already drafted. Per-user via
 * the scope seam; nothing here is ever sent to employers automatically.
 */

export type ShiftPref = 'days' | 'nights' | 'weekends' | 'overnight' | 'any';

export interface KitReference {
  id: string;
  name: string;
  relationship?: string;
  phone?: string;
}

export interface KitQA {
  id: string;
  question: string;
  answer: string;
}

export interface ApplyKit {
  fullName: string;
  phone: string;
  email: string;
  cityState: string;
  /** One or two sentences: why hire me. */
  pitch: string;
  earliestStart: string;
  shifts: ShiftPref[];
  hasTransportation: boolean | null;
  authorizedToWork: boolean | null;
  /** The disclosure statement they chose from the generator (optional). */
  backgroundStatement: string;
  references: KitReference[];
  /** Reusable answers to questions employers keep asking. */
  answers: KitQA[];
}

const KEY = 'applyKit';

const EMPTY: ApplyKit = {
  fullName: '', phone: '', email: '', cityState: '',
  pitch: '', earliestStart: '', shifts: [],
  hasTransportation: null, authorizedToWork: null,
  backgroundStatement: '', references: [], answers: [],
};

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((fn) => fn());

function read(): ApplyKit {
  const raw = lsGet(KEY);
  try { return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<ApplyKit>) } : EMPTY; }
  catch { return EMPTY; }
}
function write(v: ApplyKit) { lsSet(KEY, JSON.stringify(v)); }

let kit: ApplyKit = read();
onStoreChange(() => { kit = read(); emit(); });
function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }

const rid = (p: string) => p + Math.random().toString(36).slice(2, 9);

export function getApplyKit(): ApplyKit { return kit; }

export function patchApplyKit(patch: Partial<ApplyKit>) {
  kit = { ...kit, ...patch };
  write(kit); emit();
}

export function addReference(r: Omit<KitReference, 'id'>) {
  kit = { ...kit, references: [...kit.references, { ...r, id: rid('ref_') }] };
  write(kit); emit();
}
export function removeReference(id: string) {
  kit = { ...kit, references: kit.references.filter((x) => x.id !== id) };
  write(kit); emit();
}
export function addAnswer(q: Omit<KitQA, 'id'>) {
  kit = { ...kit, answers: [...kit.answers, { ...q, id: rid('qa_') }] };
  write(kit); emit();
}
export function updateAnswer(id: string, patch: Partial<Omit<KitQA, 'id'>>) {
  kit = { ...kit, answers: kit.answers.map((a) => (a.id === id ? { ...a, ...patch } : a)) };
  write(kit); emit();
}
export function removeAnswer(id: string) {
  kit = { ...kit, answers: kit.answers.filter((x) => x.id !== id) };
  write(kit); emit();
}

/** How complete the kit is (0–100), for the "X% ready" nudge. */
export function kitCompleteness(k: ApplyKit): number {
  const checks = [
    !!k.fullName, !!k.phone, !!(k.email || k.cityState), !!k.pitch,
    !!k.earliestStart, k.shifts.length > 0, k.hasTransportation !== null,
    k.references.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function useApplyKit(): ApplyKit {
  return useSyncExternalStore(subscribe, getApplyKit, () => EMPTY);
}
