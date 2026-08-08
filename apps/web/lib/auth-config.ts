/**
 * Whether real accounts are turned on. True only when a Clerk publishable key
 * is present at build time. When false, the whole auth layer is inert: the app
 * runs exactly as before (single local 'guest' scope, behind the site-password
 * gate) and no Clerk code executes. This is the single switch every auth-aware
 * component branches on — a build-time constant, so the branch is stable and
 * safe for the rules of hooks.
 *
 * NEXT_PUBLIC_* is inlined into the client bundle by Next at build time.
 */
export const AUTH_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0,
);

export const CLERK_USES_DEVELOPMENT_KEY =
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '').startsWith('pk_test_');

/** Production must never run on Clerk's relaxed development instance. */
export const AUTH_CONFIGURATION_SAFE =
  !AUTH_ENABLED || process.env.NODE_ENV !== 'production' || !CLERK_USES_DEVELOPMENT_KEY;

export function staffRoleFromClaims(claims: Record<string, unknown> | null | undefined): string | null {
  if (!claims) return null;
  const nested = (key: string) => {
    const value = claims[key];
    return value && typeof value === 'object' ? (value as Record<string, unknown>).role : undefined;
  };
  const value = claims.role ?? nested('metadata') ?? nested('publicMetadata');
  return typeof value === 'string' ? value.toLowerCase() : null;
}

export function hasStaffRole(claims: Record<string, unknown> | null | undefined): boolean {
  return ['staff', 'caseworker', 'admin'].includes(staffRoleFromClaims(claims) ?? '');
}

/**
 * The ONLY routes viewable without signing in, when accounts are enabled.
 * Everything else in the app requires a signed-in user — login or account
 * creation comes before anything in the system. Kept deliberately tiny.
 *
 * Exact-match, public:
 *  - '/'                 the welcome / front door (its CTAs lead to sign-up)
 *  - static files the welcome + auth pages need to render
 *
 * To make the login screen the very first thing anyone sees (no public
 * welcome at all), remove '/' from PUBLIC_EXACT — the root will then redirect
 * unauthenticated visitors straight to /sign-in.
 */
export const PUBLIC_EXACT = [
  '/',
  '/logo.png',
  '/favicon.ico',
  '/us-states-10m.json',
  '/robots.txt',
];

/** Prefix-match, public: the account pages themselves (+ Clerk sub-routes). */
export const PUBLIC_PREFIXES = [
  '/sign-in',
  '/sign-up',
];

/** True when a path may be viewed without signing in (accounts-enabled mode). */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
