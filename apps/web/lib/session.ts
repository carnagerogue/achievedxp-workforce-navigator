'use client';

// Phase-1/2 session is just a userId in localStorage. Phase 8 replaces this
// with JWT access+refresh cookies. Keeping the API surface small makes that
// swap trivial — callers only ever ask for `getUserId()`.

const KEY = 'dxp.userId';

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(KEY);
}

export function setUserId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, id);
}

export function clearUserId(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}
