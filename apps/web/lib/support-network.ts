'use client';

import { useSyncExternalStore } from 'react';
import { lsGet, lsSet, onStoreChange } from './scoped-storage';

/**
 * "Your Corner" — a support map for the person who feels they have no one.
 *
 * Sustained, prosocial relationships are among the strongest protective factors
 * in reentry, while isolation makes everything harder (Urban Institute, Arches
 * mentoring evaluation; Vera Institute on isolation; Maruna on desistance). The
 * count matters less than the *quality* of ties — families can be supportive or
 * a pull backward — so contacts are tagged, and the app nudges toward the
 * positive ones and gently flags the risky ones. Browser-local, private.
 */

export type ContactTag = 'support' | 'professional' | 'risky';

export interface Contact {
  id: string;
  name: string;
  /** Free-text relationship: "sister", "sponsor", "parole officer", "old friend". */
  relationship?: string;
  tag: ContactTag;
  phone?: string;
  /** ISO yyyy-mm-dd of the last time they reached out (for keep-in-touch nudges). */
  lastReachedOut?: string;
  createdAt: number;
}

export const CONTACT_TAG_LABEL: Record<ContactTag, string> = {
  support: 'In my corner',
  professional: 'Professional help',
  risky: 'Pulls me backward',
};

const KEY = 'corner';

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((fn) => fn());

function read(): Contact[] {
  const raw = lsGet(KEY);
  try { return raw ? (JSON.parse(raw) as Contact[]) : []; } catch { return []; }
}
function write(v: Contact[]) { lsSet(KEY, JSON.stringify(v)); }

let contacts: Contact[] = read();

onStoreChange(() => { contacts = read(); emit(); });
function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }

export function getContacts(): Contact[] { return contacts; }

export function addContact(c: Omit<Contact, 'id' | 'createdAt'>): Contact {
  const entry: Contact = { ...c, id: 'ct_' + Math.random().toString(36).slice(2, 9), createdAt: Date.now() };
  contacts = [...contacts, entry];
  write(contacts); emit();
  return entry;
}
export function updateContact(id: string, patch: Partial<Contact>) {
  contacts = contacts.map((c) => (c.id === id ? { ...c, ...patch } : c));
  write(contacts); emit();
}
export function removeContact(id: string) {
  contacts = contacts.filter((c) => c.id !== id);
  write(contacts); emit();
}
export function markReachedOut(id: string, dateIso: string) {
  updateContact(id, { lastReachedOut: dateIso });
}

const EMPTY: Contact[] = [];
export function useContacts(): Contact[] {
  return useSyncExternalStore(subscribe, getContacts, () => EMPTY);
}

/** How many positive (in-your-corner) ties the person has — a success signal. */
export function supportCount(list: Contact[]): number {
  return list.filter((c) => c.tag === 'support').length;
}

const DAY = 24 * 60 * 60 * 1000;
function epoch(d?: string): number {
  if (!d) return NaN;
  const [y, m, dd] = d.split('-').map(Number);
  return y && m && dd ? new Date(y, m - 1, dd).getTime() : NaN;
}
/** Supportive ties not reached out to in 14+ days — gentle keep-in-touch nudges. */
export function staleSupportContacts(list: Contact[], now = Date.now()): Contact[] {
  return list.filter((c) => {
    if (c.tag !== 'support') return false;
    const e = epoch(c.lastReachedOut);
    return Number.isNaN(e) || now - e >= 14 * DAY;
  });
}
