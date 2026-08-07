'use client';

/**
 * Header auth affordance: a "Sign in" pill when signed out, the Clerk user
 * avatar/menu (with Sign out) when signed in. Renders nothing when accounts
 * are disabled, so the header is unchanged in local/no-auth mode.
 */
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { AUTH_ENABLED } from '../../lib/auth-config';

export function AuthControls() {
  if (!AUTH_ENABLED) return null;
  return (
    <div className="flex shrink-0 items-center">
      <SignedOut>
        <Link
          href="/sign-in"
          className="inline-flex items-center rounded-full border border-slate-900/10 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900/20 hover:text-slate-900"
        >
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{ elements: { avatarBox: 'h-8 w-8' } }}
        />
      </SignedIn>
    </div>
  );
}
