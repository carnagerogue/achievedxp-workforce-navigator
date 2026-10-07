'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { StoredProfile } from './profile-store';
import { lsGet, lsSet, lsRemove, onStoreChange } from './scoped-storage';

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
const KEY = 'profile';

/** The stored profile plus account fields the wizard needs to re-hydrate on edit. */
export type LocalProfile = StoredProfile & { email?: string; displayName?: string };

export function getLocalProfile(): LocalProfile | null {
  const raw = lsGet(KEY);
  try { return raw ? (JSON.parse(raw) as LocalProfile) : null; } catch { return null; }
}

export function setLocalProfile(p: LocalProfile) {
  lsSet(KEY, JSON.stringify(p));
}

export function clearLocalProfile() {
  lsRemove(KEY);
}

/**
 * Reactive read of the saved profile for chrome that outlives a page (the
 * header and section tabs). Re-reads on navigation — onboarding saves and then
 * routes away — and whenever the active account scope changes.
 */
export function useLocalProfile(): LocalProfile | null {
  const pathname = usePathname();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  useEffect(() => {
    setProfile(getLocalProfile());
    return onStoreChange(() => setProfile(getLocalProfile()));
  }, [pathname]);
  return profile;
}
