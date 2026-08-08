'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Rocket, Check, X, ChevronDown, ExternalLink, Lightbulb, Users, GraduationCap,
  Coins, FileText, ArrowRight, ShieldCheck,
} from 'lucide-react';
import {
  BIZ_STAGES, BIZ_RESOURCES, BIZ_RESOURCE_TAG, BIZ_IDEAS,
  type BizStage, type BizResource,
} from '../../lib/entrepreneurship';

const TAG_ICON: Record<BizResource['tag'], typeof Users> = {
  mentor: Users, learn: GraduationCap, money: Coins, legal: FileText,
};
const TAG_PILL: Record<BizResource['tag'], string> = {
  mentor: 'bg-teal-100 text-teal-700',
  learn: 'bg-violet-100 text-violet-700',
  money: 'bg-amber-100 text-amber-700',
  legal: 'bg-sky-100 text-sky-700',
};

export default function EntrepreneurshipPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      {/* Header */}
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
        <div className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 px-6 py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_85%_-20%,rgba(45,212,229,0.25),transparent)]" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-200">
              <Rocket className="h-4 w-4" /> Be your own boss
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Could working for yourself be your path?</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-teal-50/85">
              Self-employment can reduce employer screening, but licensing, bonding, contracting, insurance, and customer checks vary by trade and state. Here&apos;s an honest look at whether it&apos;s for you — and the free help to start.
            </p>
          </div>
        </div>
      </header>

      {/* Honest pros / cons */}
      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
          <p className="text-sm font-bold text-navy-900">Why it can be a great fit</p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
            {['You choose which customers and projects to pursue','You set your own hours and rules','Many trades start small, with skills you may already have','Your income isn’t capped by a pay grade'].map((t) => (
              <li key={t} className="flex items-start gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
          <p className="text-sm font-bold text-navy-900">Be honest with yourself</p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
            {['Money is unstable at first — have a little runway','It all rides on you: no boss, no steady paycheck','Some work needs a license or a bond','Taxes and records are now your job too'].map((t) => (
              <li key={t} className="flex items-start gap-1.5"><X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> {t}</li>
            ))}
          </ul>
        </div>
      </section>
      <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Smart move:</span> many people start a business on the side while
        keeping a job, then go full-time once it&apos;s steady. Not sure a job is the right first step?{' '}
        <Link href="/jobs" className="font-semibold text-teal-700 hover:underline">Browse fair-chance jobs</Link> too.
      </p>

      {/* Steps */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-base font-bold text-navy-900">The steps, one at a time</h2>
        <p className="mt-0.5 text-sm text-slate-600">You don&apos;t need it all figured out — just the next step.</p>
        <ul className="mt-3 space-y-2">
          {BIZ_STAGES.map((s) => <StageRow key={s.id} s={s} />)}
        </ul>
      </section>

      {/* Ideas */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="inline-flex items-center gap-2 text-base font-bold text-navy-900"><Lightbulb className="h-4 w-4 text-amber-500" /> Low-cost ideas to start with</h2>
        <p className="mt-0.5 text-sm text-slate-600">Record-friendly businesses people start small. The best one is usually a skill you already have.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {BIZ_IDEAS.map((i) => (
            <li key={i.name} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-navy-900">{i.name}</p>
              <p className="mt-0.5 text-xs text-slate-600">{i.note}</p>
            </li>
          ))}
        </ul>
        <Link href="/apprenticeships" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline">
          Explore trades &amp; apprenticeships <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* Free help */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-base font-bold text-navy-900">Free help to get going</h2>
        <p className="mt-0.5 text-sm text-slate-600">Real mentoring, courses, and 0%-interest money — all free, no account needed here.</p>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {BIZ_RESOURCES.map((r) => <ResourceCard key={r.id} r={r} />)}
        </ul>
      </section>

      <p className="mt-4 mb-2 text-center text-[11px] text-slate-400">
        General guidance, not legal or financial advice. Rules vary by state — a free mentor or SBDC can help you do it right.
      </p>
    </div>
  );
}

function StageRow({ s }: { s: BizStage }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-slate-200 p-3.5">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="text-sm font-semibold text-navy-900">{s.title}</span>
        <ChevronDown className={'h-4 w-4 shrink-0 text-slate-400 transition ' + (open ? 'rotate-180' : '')} />
      </button>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.why}</p>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="rounded-lg bg-teal-50/60 px-3 py-2 text-xs text-teal-900"><span className="font-semibold">First step:</span> {s.tip}</p>
          {s.reentryNote && (
            <p className="inline-flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-600">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-teal-600" /> {s.reentryNote}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function ResourceCard({ r }: { r: BizResource }) {
  const Icon = TAG_ICON[r.tag];
  return (
    <li className="flex flex-col rounded-xl border border-slate-200 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-navy-900">{r.name}</h3>
        <span className={'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ' + TAG_PILL[r.tag]}><Icon className="h-2.5 w-2.5" /> {BIZ_RESOURCE_TAG[r.tag]}</span>
      </div>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{r.what}</p>
      <p className="mt-1.5 text-[10px] text-slate-400">{r.source}</p>
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
        Open <ExternalLink className="h-3 w-3" />
      </a>
    </li>
  );
}
