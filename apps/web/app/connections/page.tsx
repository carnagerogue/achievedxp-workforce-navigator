'use client';

import Link from 'next/link';
import { Link2, ShieldCheck, ArrowRight, Radio, FileText } from 'lucide-react';
import { PROVIDERS, FEED_SOURCES, useConnections } from '../../lib/connections';
import { ConnectionTile } from '../../components/connections/ConnectionTile';

export default function ConnectionsPage() {
  const conns = useConnections();
  const count = Object.keys(conns).length;

  const identity = PROVIDERS.filter((p) => p.category === 'identity');
  const boards = PROVIDERS.filter((p) => p.category === 'jobBoard');

  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <header className="rounded-3xl border border-slate-900/[0.07] bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <Link2 className="h-3.5 w-3.5" /> Connections
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">One account. All your job hunt.</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
          Your Achieve account is the hub. Connect the places you already job-hunt so everything lives in
          one spot — the same profile, one tracker, one feed. You sign in on each site yourself; we never
          hold your passwords and never apply for you.
        </p>
        {count > 0 && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1.5 text-sm font-semibold text-teal-800">
            <ShieldCheck className="h-4 w-4" /> {count} connected
          </p>
        )}
      </header>

      {/* Identity — the real sign-in providers */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Sign in faster</h2>
          <span className="text-xs text-slate-400">Fills your Apply Kit — name &amp; email only</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {identity.map((p) => <ConnectionTile key={p.id} provider={p} />)}
        </div>
      </section>

      {/* Job boards — honest handoffs */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Your job-board accounts</h2>
          <span className="text-xs text-slate-400">Set up once, apply from one place</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {boards.map((p) => <ConnectionTile key={p.id} provider={p} />)}
        </div>
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
          Indeed, LinkedIn, ZipRecruiter, and Monster don&apos;t let any outside app sign in to your account
          or apply for you — so connecting here means opening their site, signing in yourself, and letting us
          remember you have an account so your applies land in the right place. Honest and safe by design.
        </p>
      </section>

      {/* Feed sources — already on */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline gap-2">
          <Radio className="h-4 w-4 text-teal-600" />
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Already working for you</h2>
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Your job feed is already aggregating from licensed sources — nothing to connect, always on.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {FEED_SOURCES.map((s) => (
            <div key={s.name} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-teal-500" aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-900">{s.name}</h3>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Apply Kit cross-link */}
      <Link href="/apply-kit" className="mt-8 flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/50 p-4 transition hover:border-teal-400">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white"><FileText className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">Fill your Apply Kit once</span>
          <span className="block text-xs text-slate-500">Your answers, ready to paste into every application — wherever you apply.</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-teal-700" />
      </Link>

      <p className="mb-2 mt-6 text-center text-[11px] text-slate-400">
        Connections are private to your account and only link accounts on your side. Disconnecting never touches your account on the other site.
      </p>
    </div>
  );
}
