import { NextResponse, type NextRequest } from 'next/server';

/**
 * Site-wide password gate.
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

/**
 * Match every path except Next.js framework + static asset routes that
 * the matcher excludes for performance — those still get re-checked
 * inside the function body via ALLOWLIST_PREFIXES anyway, so this is
 * just an optimization.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
