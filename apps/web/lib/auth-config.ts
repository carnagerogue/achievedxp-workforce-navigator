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
