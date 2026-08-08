'use client';

/**
 * Header auth affordance: a "Sign in" pill while Clerk is loading or signed
 * out, and the Clerk user avatar/menu when signed in. Renders nothing when
 * accounts are disabled, so the header is unchanged in local/no-auth mode.
 */
import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';
import { AUTH_ENABLED } from '../../lib/auth-config';
import { accountDisplayName, accountImageUrl } from '../../lib/account-identity';
import { Avatar } from '../common/Avatar';

export function AuthControls() {
  if (!AUTH_ENABLED) return null;
  return <ClerkAuthControls />;
}

function ClerkAuthControls() {
  const { isLoaded, user } = useUser();

  // SignedOut deliberately renders nothing until Clerk has resolved the
  // session. Keeping the link independent of that control component means a
  // cold Clerk script can never make the app's only account entry point
  // disappear.
  if (!isLoaded || !user) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex items-center rounded-full border border-slate-900/10 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900/20 hover:text-slate-900"
      >
        Sign in
      </Link>
    );
  }

  const name = accountDisplayName(user) || 'Account';
  const imageUrl = accountImageUrl(user);
  return (
    <div className="flex shrink-0 items-center">
      <span className="account-orbit inline-flex h-10 w-10 items-center justify-center rounded-full" title={`${name} · Account menu`}>
        <UserButton
          afterSignOutUrl="/"
          appearance={{ elements: {
            avatarBox: 'h-10 w-10 opacity-0',
            avatarImage: 'opacity-0',
            userButtonTrigger: 'relative z-10 h-10 w-10 rounded-full focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
          } }}
        />
        <span className="account-orbit__portrait pointer-events-none absolute inset-[3px] z-20">
          <Avatar name={name} imageUrl={imageUrl} size={34} />
        </span>
      </span>
    </div>
  );
}
