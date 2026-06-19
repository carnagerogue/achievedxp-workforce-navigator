'use client';

import type { StoredProfile } from './profile-store';

/**
 * Client-side copy of the user's profile (localStorage), written at onboarding.
 * Two jobs:
 *   1. Lets Browse /jobs and job detail score with the user's REAL profile
 *      (the same shared scorer the dashboard uses) instead of conviction-only.
 *   2. Lets onboarding hydrate its wizard when editing, so "Edit profile" no
 *      longer overwrites the saved record with blanks.
 *
 * (The server profile-store still backs the dashboard matches endpoint; moving
 * the personal profile fully client-side is part of the auth/PII decision in
 * docs/caseworker-auth-plan.md.)
 */
const KEY = 'dxp.profile';

/** The stored profile plus account fields the wizard needs to re-hydrate on edit. */
export type LocalProfile = StoredProfile & { email?: string; displayName?: string };

export function getLocalProfile(): LocalProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalProfile) : null;
  } catch { return null; }
}

export function setLocalProfile(p: LocalProfile) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* quota */ }
}

export function clearLocalProfile() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}
