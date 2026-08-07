'use client';

// The server-facing user id used for match/assessment/profile API calls.
//
// When Clerk auth is enabled and someone is signed in, AuthScopeSync sets this
// to the verified Clerk user id, so server-side data keys off a real identity.
// When auth is off, it holds the locally-generated id from onboarding. Either
// way it is namespaced by the active scope, so it is per-user on the device.

import { lsGet, lsSet, lsRemove } from './scoped-storage';

const KEY = 'userId';

export function getUserId(): string | null {
  return lsGet(KEY);
}

export function setUserId(id: string): void {
  lsSet(KEY, id);
}

export function clearUserId(): void {
  lsRemove(KEY);
}
