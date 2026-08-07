'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Check, Plus, Loader2 } from 'lucide-react';
import type { Provider } from '../../lib/connections';
import { connect, isConnected } from '../../lib/connections';
import { getApplyKit, patchApplyKit } from '../../lib/apply-kit';

/**
 * Real identity connect for Google / Microsoft / LinkedIn, via Clerk.
 *
 * This is the genuine "connect your account" path: linking an OAuth provider to
 * the signed-in user (Clerk's standard external-account link — we never hold a
 * password), and a linked identity fills the Apply Kit with the verified name
 * and email. It is only ever rendered when accounts are on (a Clerk key is set),
 * so the Clerk hook is always inside a ClerkProvider.
 */

// Our provider id → Clerk OAuth strategy, and the values Clerk reports back on
// `externalAccount.provider` for a linked account.
const STRATEGY: Record<string, string> = {
  google: 'oauth_google',
  microsoft: 'oauth_microsoft',
  linkedin: 'oauth_linkedin_oidc',
};
const MATCHES: Record<string, string[]> = {
  google: ['google'],
  microsoft: ['microsoft'],
  linkedin: ['linkedin_oidc', 'linkedin'],
};

type Ext = { provider?: string; emailAddress?: string; firstName?: string | null; lastName?: string | null };

export function IdentityConnect({ provider }: { provider: Provider }) {
  const { isLoaded, user } = useUser();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const accounts = ((user?.externalAccounts ?? []) as unknown as Ext[]);
  const match = MATCHES[provider.id] ?? [];
  const ext = accounts.find((a) => !!a.provider && match.some((m) => a.provider === m || a.provider!.startsWith(m)));
  const linked = !!ext;
  const email = ext?.emailAddress || user?.primaryEmailAddress?.emailAddress || '';

  // A linked identity is a real connection: mirror it into the tracker (so the
  // tile's "Connected" chip shows) and fill the Apply Kit from the verified
  // name + email — only empty fields, never overwriting what the person typed.
  useEffect(() => {
    if (!linked || !ext) return;
    if (!isConnected(provider.id)) {
      connect(provider.id, { handle: ext.emailAddress || undefined, connectedAt: Date.now() });
    }
    const name = [ext.firstName, ext.lastName].filter(Boolean).join(' ').trim() || (user?.fullName ?? '');
    const patch: Record<string, string> = {};
    const kit = getApplyKit();
    if (!kit.fullName && name) patch.fullName = name;
    if (!kit.email && email) patch.email = email;
    if (Object.keys(patch).length) patchApplyKit(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked]);

  const link = async () => {
    if (!user) return;
    setBusy(true);
    setErr('');
    try {
      // Standard Clerk external-account link → provider OAuth redirect.
      const res = (await user.createExternalAccount({
        strategy: STRATEGY[provider.id] as never,
        redirectUrl: typeof window !== 'undefined' ? window.location.href : '/connections',
      })) as unknown as { verification?: { externalVerificationRedirectURL?: URL | string | null } };
      const url = res?.verification?.externalVerificationRedirectURL;
      if (url) {
        window.location.href = String(url);
        return;
      }
      setErr('Could not start sign-in. Try again.');
    } catch {
      setErr('Sign-in with this provider isn’t enabled yet — ask your program to turn it on.');
    } finally {
      setBusy(false);
    }
  };

  if (!isLoaded) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
      </span>
    );
  }

  if (linked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-700">
        <Check className="h-3.5 w-3.5" /> Filled your Apply Kit{email ? ` · ${email}` : ''}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={link}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Connect
      </button>
      {err && <span className="max-w-[200px] text-[11px] text-rose-500">{err}</span>}
    </div>
  );
}
