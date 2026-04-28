'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, ArrowRight, AlertCircle } from 'lucide-react';
import { login, claimAccount } from '../../lib/api';
import { refreshSession } from '../../lib/session';

/**
 * Sign-in page for returning users.
 *
 * Two modes:
 *   - "Sign in" — argon2id verify against an existing password hash.
 *   - "Claim my account" — for accounts created during the pre-auth phase
 *     whose `passwordHash` is null. One-shot password set.
 *
 * If "Sign in" returns a 409 saying the account has no password yet, the
 * UI flips to claim mode automatically. After that the account behaves
 * normally.
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'claim'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await claimAccount({ email, password });
      }
      await refreshSession();
      router.push('/dashboard');
    } catch (err) {
      const msg = (err as Error).message;
      // The /auth/login endpoint returns 409 when an account exists but
      // has no password yet. Auto-flip to claim mode and ask again.
      if (mode === 'login' && msg.startsWith('API 409')) {
        setMode('claim');
        setError('This account was created before passwords were required. Set one now to continue.');
      } else if (mode === 'claim' && msg.startsWith('API 409')) {
        setMode('login');
        setError('This account already has a password — sign in instead.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <div className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-7 shadow-card sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <LogIn className="h-3.5 w-3.5" /> {mode === 'login' ? 'Sign in' : 'Claim account'}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          {mode === 'login' ? 'Welcome back' : 'Set a password to continue'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {mode === 'login'
            ? 'Sign in to see your matches, applications, and saved jobs.'
            : 'Your account exists but has no password yet. Set one now — it only happens once.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </Field>
          <Field label={mode === 'login' ? 'Password' : 'New password (min 12 characters)'}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'claim' ? 12 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </Field>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Signing in…</>
            ) : (
              <>{mode === 'login' ? 'Sign in' : 'Set password and continue'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-600">
          New here?{' '}
          <Link href="/onboarding" className="font-semibold text-teal-700 hover:underline">
            Build a profile
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
