'use client';

/**
 * Bridges the auth session to the per-user data scope. Whenever the signed-in
 * user changes (sign in, sign out, account switch), it points every local
 * store at that user's namespace — and at sign-out, at 'guest' (which is
 * empty), so no one ever sees the previous person's data on a shared device.
 *
 * Two stable variants chosen by the build-time AUTH_ENABLED constant, so the
 * Clerk hook only ever runs when a ClerkProvider is present.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AUTH_ENABLED } from '../../lib/auth-config';
import { setScope } from '../../lib/scoped-storage';
import { setUserId, clearUserId } from '../../lib/session';

type ScopeListener = () => void;
const scopeListeners = new Set<ScopeListener>();
let scopeReady = false;

function markScopeReady() {
  if (scopeReady) return;
  scopeReady = true;
  scopeListeners.forEach((listener) => listener());
}

function subscribeToScope(listener: ScopeListener) {
  scopeListeners.add(listener);
  return () => scopeListeners.delete(listener);
}

/** Prevent personal surfaces from reading the guest namespace before Clerk resolves. */
export function useAuthScopeReady(): boolean {
  return useSyncExternalStore(subscribeToScope, () => scopeReady, () => false);
}

function ClerkScopeSync() {
  const { isLoaded, userId } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    if (userId) {
      setScope(userId);
      // Server data (matches/assessment/profile) keys off this id too.
      setUserId(userId);
    } else {
      setScope('guest');
      clearUserId();
    }
    markScopeReady();
  }, [isLoaded, userId]);
  return null;
}

function GuestScopeSync() {
  useEffect(() => {
    setScope('guest');
    markScopeReady();
  }, []);
  return null;
}

export function AuthScopeSync() {
  return AUTH_ENABLED ? <ClerkScopeSync /> : <GuestScopeSync />;
}
