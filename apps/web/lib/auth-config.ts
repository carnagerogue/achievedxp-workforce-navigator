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

/** Paths that require a signed-in user when auth is enabled (personal data). */
export const PROTECTED_PREFIXES = [
  '/dashboard',
  '/plan',
  '/onboarding',
  '/assessment',
  '/caseworker',
  '/jobs/compare',
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
