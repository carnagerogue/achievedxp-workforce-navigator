'use client';

/**
 * Header auth affordance: a "Sign in" pill when signed out, the Clerk user
 * avatar/menu (with Sign out) when signed in. Renders nothing when accounts
 * are disabled, so the header is unchanged in local/no-auth mode.
 */
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { UserRound } from 'lucide-react';
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
        <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-white" title="Account menu">
          <UserRound className="pointer-events-none absolute h-4 w-4" aria-hidden="true" />
          <UserButton
            afterSignOutUrl="/"
            appearance={{ elements: {
              avatarBox: 'h-8 w-8 bg-transparent',
              avatarImage: 'hidden',
              userButtonTrigger: 'relative z-10 h-8 w-8 rounded-full focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
            } }}
          />
        </span>
      </SignedIn>
    </div>
  );
}
