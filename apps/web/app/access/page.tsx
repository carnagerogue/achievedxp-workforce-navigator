'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Lock, Loader2 } from 'lucide-react';

/**
 * Password gate page. Displayed when the user lacks a valid `dxp_gate`
 * cookie. Submits the password to /api/access; on success the server
 * sets the cookie and we redirect to the originally-requested URL.
 *
 * Wrapped in Suspense to satisfy Next.js 14's static-prerender
 * constraint on `useSearchParams()`.
 */
export default function AccessPage() {
  return (
    <Suspense fallback={null}>
      <AccessForm />
    </Suspense>
  );
}

function AccessForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp?.get('next') || '/';

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the password field on mount so the user can start typing
  // immediately on landing.
  useEffect(() => { inputRef.current?.focus(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Use a hard nav so middleware re-evaluates with the fresh cookie.
        window.location.assign(next);
        return;
      }
      const body = await res.json().catch(() => ({} as { error?: string }));
      setError(body?.error || 'Incorrect password.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-6">
      {/* Brand background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_100%_-10%,rgba(30,166,156,0.18),transparent_60%),radial-gradient(700px_400px_at_-10%_120%,rgba(245,91,29,0.12),transparent_60%)]"
      />

      <main className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Achieve DXP"
            width={170}
            height={40}
            priority
            className="h-10 w-auto"
          />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            · Workforce Navigator
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-7 shadow-card backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-200">
              <Lock className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">Pre-launch preview</p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-navy-900">Sign in to continue</h1>
              <p className="mt-1 text-sm text-slate-600">
                This site is in preview. Enter the access password to view the demo.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Access password</span>
              <input
                ref={inputRef}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="••••••••"
                aria-invalid={!!error}
                disabled={submitting}
              />
            </label>

            {error && (
              <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !password}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Signing in…' : 'Continue'}
            </button>
          </form>

          <p className="mt-5 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-500">
            Access is granted by Achieve DXP staff. If you don&rsquo;t have a password,
            request one from your contact at the organization sharing this preview.
          </p>
        </div>
      </main>
    </div>
  );
}
