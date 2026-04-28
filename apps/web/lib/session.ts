'use client';

/**
 * Cookie-backed session client.
 *
 * Pre-auth this file held a userId in localStorage; that approach
 * (a) put a routing primary key into a JS-readable storage area and
 * (b) never expired. The new flow keeps the JWT in an HttpOnly cookie
 * that JS can't read; we use `/auth/me` as the source of truth for
 * "who is the current user?" and cache the answer in a tiny in-memory
 * subscribable store so React hooks can render off it.
 *
 * Public surface:
 *   useCurrentUser()  → React hook returning { user, status }
 *   refreshSession()  → re-fetch /auth/me (call after login/register/logout)
 *   getCachedUserId() → synchronous cached id, or null
 */

import { useEffect, useSyncExternalStore } from 'react';
import { getCurrentUser, type AuthUser } from './api';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface State {
  user: AuthUser | null;
  status: Status;
}

let state: State = { user: null, status: 'loading' };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() { listeners.forEach((fn) => fn()); }

function set(next: Partial<State>) {
  state = { ...state, ...next } as State;
  emit();
}

/** Re-fetch the session from the API. Call after login/register/logout. */
export function refreshSession(): Promise<void> {
  // Coalesce concurrent calls — multiple components mounting at once
  // shouldn't fire N parallel /auth/me requests on first paint.
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const user = await getCurrentUser();
      set({ user, status: user ? 'authenticated' : 'unauthenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

const SERVER_SNAPSHOT: State = { user: null, status: 'loading' };
function getServerSnapshot(): State { return SERVER_SNAPSHOT; }
function getSnapshot(): State { return state; }

/**
 * Returns the current user + status. On first mount the hook fires a
 * single `/auth/me` to hydrate. Components that need to gate UI on
 * authentication should check `status === 'authenticated'` rather than
 * just `user != null` — the difference matters during the first paint.
 */
export function useCurrentUser(): State {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (state.status === 'loading') void refreshSession();
  }, []);
  return snapshot;
}

/** Synchronous accessor for the cached user id. May be null even when authenticated, on first paint. */
export function getCachedUserId(): string | null {
  return state.user?.id ?? null;
}
