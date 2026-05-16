'use client';

/**
 * Session helpers — Phase 2.
 *
 * userId and JWT are stored as cookies set by the /api/auth/* Next.js
 * route handlers so they survive page refreshes.  The JWT itself lives
 * in an httpOnly cookie (unreadable from JS); userId lives in a plain
 * cookie so client components can read it without a round-trip.
 *
 * Legacy localStorage fallback kept for any existing anonymous sessions
 * created before this change (will be phased out in Phase 8).
 */

const UID_COOKIE = 'dxp_uid';
const LEGACY_KEY = 'dxp.userId';

// ─── Cookie helpers (browser-only) ──────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 7): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ─── Public API ──────────────────────────────────────────────────────────

/** Returns the current user’s UUID or null if not logged in. */
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  // Prefer cookie (set by /api/auth/* route handlers after login/register).
  const fromCookie = getCookie(UID_COOKIE);
  if (fromCookie) return fromCookie;
  // Fallback: legacy localStorage value from Phase 1 anonymous sessions.
  return window.localStorage.getItem(LEGACY_KEY);
}

/**
 * Persist a userId from an anonymous onboarding session (legacy path).
 * New authenticated sessions set the cookie via the route handler.
 */
export function setUserId(id: string): void {
  if (typeof window === 'undefined') return;
  setCookie(UID_COOKIE, id);
  // Also keep localStorage in sync for legacy callers.
  try { window.localStorage.setItem(LEGACY_KEY, id); } catch { /* sandboxed */ }
}

/** Clear session (call on logout). */
export function clearUserId(): void {
  if (typeof window === 'undefined') return;
  deleteCookie(UID_COOKIE);
  try { window.localStorage.removeItem(LEGACY_KEY); } catch { /* sandboxed */ }
}

/** True when a user session exists (cookie or legacy localStorage). */
export function isLoggedIn(): boolean {
  return getUserId() !== null;
}
