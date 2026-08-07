'use client';

/**
 * Per-user data scope for every browser-local store.
 *
 * Before this, all personal data lived under flat localStorage keys
 * (`dxp.checklist`, `dxp.profile`, …) — tied to the *device*, not a person.
 * Two people on one browser saw each other's plan, conviction history, and
 * supervision dates. That is unacceptable for this data.
 *
 * Now every store reads and writes under the ACTIVE SCOPE — the signed-in
 * user's id, or `guest` when signed out / auth is not configured. Keys become
 * `dxp:<scope>:<base>`. Switching users (or signing out) flips the scope and
 * every store re-reads its own namespace, so nobody ever sees another
 * person's data on a shared device.
 *
 * `AuthScopeSync` drives `setScope()` from the auth session. Stores register a
 * re-init via `onStoreChange()` (fired on scope change AND cross-tab writes).
 */

const PREFIX = 'dxp:';
let scope = 'guest';

type Cb = () => void;
const changeCbs = new Set<Cb>();

const keyFor = (base: string) => `${PREFIX}${scope}:${base}`;

export function lsGet(base: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(keyFor(base)); } catch { return null; }
}
export function lsSet(base: string, value: string): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(keyFor(base), value); } catch { /* quota */ }
}
export function lsRemove(base: string): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(keyFor(base)); } catch { /* ignore */ }
}

export function getScope(): string { return scope; }

/**
 * Set the active scope. `null`/empty → 'guest'. On a real change, every
 * registered store re-reads its namespace and re-renders, so the UI swaps to
 * the new user's data (or clears, signing out).
 */
export function setScope(next: string | null | undefined): void {
  const s = next && next.trim() ? next.trim() : 'guest';
  if (s === scope) return;
  scope = s;
  changeCbs.forEach((fn) => fn());
}

/** Register a store's re-init. Returns an unsubscribe. */
export function onStoreChange(fn: Cb): () => void {
  changeCbs.add(fn);
  return () => changeCbs.delete(fn);
}

if (typeof window !== 'undefined') {
  // Cross-tab sync: a write to any scoped key re-inits every store. Stores
  // read the ACTIVE scope, so a write under a different user's scope is a
  // harmless no-op for them — never a cross-account read.
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key.startsWith(PREFIX)) changeCbs.forEach((fn) => fn());
  });

  // One-time cleanup of the pre-scoping flat keys (`dxp.foo`). This is the
  // stale, unattributed data that showed up with no sign-in — wipe it so it
  // can never resurface under anyone's account on a shared device. (New keys
  // use a colon, `dxp:scope:base`, so they are untouched.)
  try {
    const legacy: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('dxp.')) legacy.push(k);
    }
    legacy.forEach((k) => window.localStorage.removeItem(k));
  } catch { /* ignore */ }
}
