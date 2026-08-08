import { NextResponse, type NextRequest } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { AUTH_ENABLED, AUTH_CONFIGURATION_SAFE, hasStaffRole, isPublicPath } from './lib/auth-config';

/**
 * Two request-time gates, chosen once at module load:
 *
 *  - **Accounts enabled** (a Clerk key is set): login comes before anything.
 *    Every route is protected EXCEPT the tiny public allowlist (the welcome
 *    page, /sign-in, /sign-up, and the static files those pages need). An
 *    unauthenticated visitor to any system route is redirected to /sign-in;
 *    they must log in or create an account to see or do anything. Per-user
 *    data isolation is handled client-side by the scope seam; this enforces
 *    the sign-in wall in front of all of it.
 *
 *  - **Accounts disabled** (no Clerk key): the pre-launch site-password gate
 *    below, unchanged — the safe fallback so nothing is ever exposed before
 *    accounts are configured.
 *
 * Site-wide password gate (fallback path).
 *
 * Until the configured SITE_PASSWORD env var is matched, every request is
 * redirected to /access. Designed for pre-launch demos where the site
 * isn't ready for public traffic but needs to be sharable with partners.
 *
 * Mechanics:
 *   - SITE_PASSWORD env var holds the shared secret (Railway-side only).
 *     There is deliberately NO fallback: this repo is public, so a default
 *     committed here would be equivalent to no gate. If the env var is
 *     unset the gate fails closed (503) until it's configured, unless the
 *     gate is explicitly disabled with SITE_GATE=off.
 *   - On successful POST to /api/access, the route handler sets a cookie
 *     `dxp_gate` whose value is the SHA-256 hex of the password.
 *   - Each request, this middleware re-derives the expected hash and
 *     constant-time-compares it to the cookie. Rotating the env var
 *     instantly invalidates every existing session.
 *   - The gate runs in the Edge Runtime, so it uses Web Crypto's
 *     subtle.digest rather than node:crypto.
 *
 * Allowlist:
 *   /access, /api/access, /_next/*, /logo.png, /us-states-10m.json,
 *   /favicon.ico — everything required for the gate page itself to
 *   render and submit the password.
 */

const COOKIE = 'dxp_gate';

const ALLOWLIST_EXACT = new Set<string>([
  '/access',
  '/api/access',
  '/favicon.ico',
  '/logo.png',
  '/us-states-10m.json',
  '/robots.txt',
]);

const ALLOWLIST_PREFIXES = [
  '/_next/',
  '/_vercel/',
];

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Accounts-on path: everything requires sign-in except the public allowlist. */
const clerkGate = clerkMiddleware((auth, req) => {
  if (!AUTH_CONFIGURATION_SAFE) {
    return new NextResponse('Production authentication is not configured. Replace Clerk development keys with live production keys.', { status: 503 });
  }
  const pathname = req.nextUrl.pathname;
  if (!isPublicPath(pathname)) auth().protect();
  if (pathname === '/caseworker' || pathname.startsWith('/caseworker/')) {
    const { sessionClaims } = auth();
    if (!hasStaffRole(sessionClaims as unknown as Record<string, unknown>)) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '?staffAccess=denied';
      return NextResponse.redirect(url);
    }
  }
});

/** Accounts-off path: the original pre-launch site-password gate. */
async function passwordGate(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // A shared preview password is not staff authorization. The caseworker
  // surface is opt-in only for controlled demos when accounts are disabled.
  if ((pathname === '/caseworker' || pathname.startsWith('/caseworker/')) && process.env.CASEWORKER_PREVIEW !== 'on') {
    return new NextResponse('Staff access is not enabled.', { status: 403 });
  }

  // Operator escape hatch: SITE_GATE=off disables the gate entirely.
  if (process.env.SITE_GATE === 'off') return NextResponse.next();

  // Allow gate-page assets + Next.js internals through unconditionally.
  if (ALLOWLIST_EXACT.has(pathname)) return NextResponse.next();
  if (ALLOWLIST_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // The gate. No committed fallback (the repo is public — a default here is
  // a published password). Unset env = fail closed until it's configured.
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    return new NextResponse(
      'This site is gated but no SITE_PASSWORD is configured. Set SITE_PASSWORD on the deployment, or SITE_GATE=off to disable the gate.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }
  const expected = await sha256Hex(password);
  const cookie = req.cookies.get(COOKIE)?.value ?? '';

  if (cookie && constantTimeEqual(cookie, expected)) {
    return NextResponse.next();
  }

  // Block. Preserve the intended path so we can return there after auth.
  const url = req.nextUrl.clone();
  url.pathname = '/access';
  url.search = `?next=${encodeURIComponent(pathname + (req.nextUrl.search || ''))}`;
  return NextResponse.redirect(url);
}

// One gate, chosen at module load. `clerkGate` is only constructed in the
// enabled branch, so no Clerk key is ever required to run the password gate.
const middleware = AUTH_ENABLED ? clerkGate : passwordGate;
export default middleware;

/**
 * Match every path except Next.js framework + static asset routes that
 * the matcher excludes for performance — those still get re-checked
 * inside the function body via ALLOWLIST_PREFIXES anyway, so this is
 * just an optimization.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
