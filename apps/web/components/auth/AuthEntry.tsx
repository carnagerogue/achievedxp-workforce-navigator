'use client';

import Link from 'next/link';
import { SignIn, SignUp, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

type AuthMode = 'sign-in' | 'sign-up';

const RETRY_KEY = 'achieve:auth-load-retry';
const RETRY_AFTER_MS = 10_000;
const RETRY_WINDOW_MS = 60_000;

function clearLoadRetry() {
  try {
    window.sessionStorage.removeItem(RETRY_KEY);
  } catch {
    // Storage can be unavailable in strict privacy modes. Auth still works.
  }
}

function AuthLoading({ mode }: { mode: AuthMode }) {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const lastRetry = Number(window.sessionStorage.getItem(RETRY_KEY) || 0);
        if (!Number.isFinite(lastRetry) || Date.now() - lastRetry > RETRY_WINDOW_MS) {
          window.sessionStorage.setItem(RETRY_KEY, String(Date.now()));
          window.location.reload();
          return;
        }
      } catch {
        // Fall through to the visible recovery state when storage/reload
        // coordination is unavailable.
      }
      setStalled(true);
    }, RETRY_AFTER_MS);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-[25rem]" aria-live="polite" aria-busy={!stalled}>
      <div className="mb-5 grid grid-cols-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        <Link
          href="/sign-in"
          aria-current={mode === 'sign-in' ? 'page' : undefined}
          className={`rounded-full px-4 py-2 text-center text-sm font-semibold transition ${mode === 'sign-in' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          aria-current={mode === 'sign-up' ? 'page' : undefined}
          className={`rounded-full px-4 py-2 text-center text-sm font-semibold transition ${mode === 'sign-up' ? 'bg-teal-700 text-white' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Create account
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
        {stalled ? (
          <div className="py-5 text-center">
            <p className="text-lg font-semibold text-slate-900">The secure sign-in took too long to load.</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your information is safe. Check your connection or browser privacy settings, then try once more.
            </p>
            <button
              type="button"
              onClick={() => {
                clearLoadRetry();
                window.location.reload();
              }}
              className="mt-5 inline-flex rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Try secure sign-in again
            </button>
          </div>
        ) : (
          <div className="space-y-4" role="status">
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-xs font-medium text-slate-400">Preparing secure access</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            <span className="sr-only">Loading account options</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AuthEntry({ mode }: { mode: AuthMode }) {
  const { isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) clearLoadRetry();
  }, [isLoaded]);

  if (!isLoaded) return <AuthLoading mode={mode} />;

  if (mode === 'sign-in') {
    return (
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    );
  }

  return (
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      fallbackRedirectUrl="/onboarding"
    />
  );
}
