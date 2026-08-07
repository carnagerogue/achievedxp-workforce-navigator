/**
 * Server-side identity. Route handlers that read or write personal data must
 * key off the VERIFIED session — never a user id sent by the client — or one
 * signed-in user could read another's data by changing the id in the URL.
 *
 * `resolveUserId(fallback)` returns the authenticated Clerk user id when
 * accounts are enabled and someone is signed in; otherwise the caller's
 * fallback (the path/legacy id), preserving today's no-auth behavior.
 *
 * SERVER-ONLY: imports @clerk/nextjs/server. Only ever called from Node route
 * handlers (never a client component), and only invokes auth() when accounts
 * are enabled (so clerkMiddleware has run for the request).
 */
import { auth } from '@clerk/nextjs/server';
import { AUTH_ENABLED } from './auth-config';

export function getAuthUserId(): string | null {
  if (!AUTH_ENABLED) return null;
  try {
    return auth().userId ?? null;
  } catch {
    return null;
  }
}

/**
 * The id a personal route should use: the verified session id when available,
 * else the fallback the caller derived from the request (path param / body).
 */
export function resolveUserId(fallback: string | null | undefined): string | null {
  return getAuthUserId() ?? (fallback ?? null);
}
