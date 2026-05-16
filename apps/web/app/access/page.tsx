'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Lock, LogIn, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { setUserId } from '../../lib/session';

export default function AccessPage() {
  return (
    <Suspense fallback={null}>
      <AccessForm />
    </Suspense>
  );
}

type Tab = 'preview' | 'login' | 'register';

function AccessForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp?.get('next') || '/';

  const [tab, setTab] = useState<Tab>('login');

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-6 py-12">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_100%_-10%,rgba(1,105,111,0.14),transparent_60%),radial-gradient(700px_400px_at_-10%_120%,rgba(245,91,29,0.08),transparent_60%)]"
      />

      <main className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="Achieve DXP" width={170} height={40} priority className="h-10 w-auto" />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            · Workforce Navigator
          </p>
        </div>

        {/* Tab selector */}
        <div className="mb-4 flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <TabBtn active={tab === 'login'} onClick={() => setTab('login')} icon={<LogIn className="h-4 w-4" />} label="Sign in" />
          <TabBtn active={tab === 'register'} onClick={() => setTab('register')} icon={<UserPlus className="h-4 w-4" />} label="Create account" />
          <TabBtn active={tab === 'preview'} onClick={() => setTab('preview')} icon={<Lock className="h-4 w-4" />} label="Preview" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-7 shadow-lg backdrop-blur">
          {tab === 'login' && <LoginForm next={next} router={router} />}
          {tab === 'register' && <RegisterForm next={next} router={router} switchToLogin={() => setTab('login')} />}
          {tab === 'preview' && <PreviewGateForm next={next} router={router} />}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Built for justice-impacted job seekers &mdash; every score is explainable.
        </p>
      </main>
    </div>
  );
}

// ─── Tab button ──────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
        active
          ? 'bg-teal-700 text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}{label}
    </button>
  );
}

// ─── Shared field component ──────────────────────────────────────────────

function Field({
  label, id, type = 'text', value, onChange, placeholder, autoFocus, error,
}: {
  label: string; id: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoFocus?: boolean; error?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-teal-500/40 ${
            error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white focus:border-teal-500'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
    >
      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Working&hellip;</> : label}
    </button>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────

function LoginForm({ next, router }: { next: string; router: ReturnType<typeof useRouter> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.message ?? 'Invalid email or password.'); return; }
      setUserId(data.id);
      window.location.assign(next);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your Workforce Navigator account.</p>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}
      <Field label="Email" id="login-email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
      <Field label="Password" id="login-password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      <SubmitBtn loading={loading} label="Sign in" />
    </form>
  );
}

// ─── Register form ──────────────────────────────────────────────────────────

function RegisterForm({
  next,
  router,
  switchToLogin,
}: {
  next: string;
  router: ReturnType<typeof useRouter>;
  switchToLogin: () => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.message ?? 'Registration failed. Try a different email.'); return; }
      setUserId(data.id);
      // New users go through onboarding first.
      window.location.assign('/onboarding');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Free. Takes about 3 minutes to set up.</p>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}
      <Field label="Display name (optional)" id="reg-name" value={displayName} onChange={setDisplayName} placeholder="e.g. Marcus" />
      <Field label="Email" id="reg-email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
      <Field label="Password" id="reg-password" type="password" value={password} onChange={setPassword} placeholder="8+ characters" />
      <Field label="Confirm password" id="reg-confirm" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password" />
      <SubmitBtn loading={loading} label="Create account &amp; start onboarding" />
      <p className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <button type="button" onClick={switchToLogin} className="text-teal-700 hover:underline">Sign in</button>
      </p>
    </form>
  );
}

// ─── Preview gate (existing password form, preserved) ──────────────────────────

function PreviewGateForm({ next, router }: { next: string; router: ReturnType<typeof useRouter> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { window.location.assign(next); return; }
      const body = await res.json().catch(() => ({} as { error?: string }));
      setError(body?.error || 'Incorrect password.');
    } catch { setError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-200">
          <Lock className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">Pre-launch preview</p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">Preview access</h2>
          <p className="mt-1 text-sm text-slate-500">Enter the shared preview password to browse the demo without an account.</p>
        </div>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div>
        <label htmlFor="preview-pw" className="mb-1 block text-sm font-medium text-slate-700">Preview password</label>
        <input
          ref={inputRef}
          id="preview-pw"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
        />
      </div>
      <SubmitBtn loading={submitting} label="Enter preview" />
    </form>
  );
}
