'use client';

import Link from 'next/link';
import {
  GraduationCap, ExternalLink, Sparkles, BookOpen, Award, Wrench, Lightbulb, ArrowRight,
} from 'lucide-react';
import {
  LEARN_COST_META, LEARN_CATEGORY_META, LEARN_TIPS, learnByCategory,
  type LearnCategory, type LearnResource,
} from '../../lib/learning';

const CATEGORY_ICON: Record<LearnCategory, typeof BookOpen> = {
  free: BookOpen, credit: GraduationCap, certs: Award, programs: Wrench,
};
const CATEGORY_ORDER: LearnCategory[] = ['free', 'certs', 'credit', 'programs'];

const COST_PILL: Record<string, string> = {
  good: 'bg-teal-100 text-teal-700',
  info: 'bg-sky-100 text-sky-700',
  maybe: 'bg-amber-100 text-amber-700',
  special: 'bg-violet-100 text-violet-700',
};

export default function LearnPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-4xl">
      {/* Header */}
      <header className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-7 shadow-card sm:p-9">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <GraduationCap className="h-3.5 w-3.5" /> Learn new skills
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">Up your game — for free or close to it.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          New skills and credentials open better-paying, more stable work — and people who keep learning are far less
          likely to go back. Everything below is free or low-cost, works on your phone, and doesn’t care about your record.
        </p>
      </header>

      {/* Keep-it-cheap tips */}
      <section className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-navy-900"><Sparkles className="h-4 w-4 text-teal-600" /> How to keep it free (or nearly)</p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {LEARN_TIPS.map((t) => (
            <li key={t} className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-700"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {t}</li>
          ))}
        </ul>
      </section>

      {/* Grouped resources */}
      <div className="mt-5 space-y-5">
        {CATEGORY_ORDER.map((cat) => {
          const list = learnByCategory(cat);
          if (list.length === 0) return null;
          const Icon = CATEGORY_ICON[cat];
          return (
            <section key={cat} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon className="h-4 w-4" /></span>
                <div>
                  <h2 className="text-base font-bold text-navy-900">{LEARN_CATEGORY_META[cat].label}</h2>
                  <p className="text-xs text-slate-500">{LEARN_CATEGORY_META[cat].blurb}</p>
                </div>
              </div>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {list.map((r) => <LearnCard key={r.id} r={r} />)}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
        <p className="text-sm font-semibold text-navy-900">Ready to put new skills to work?</p>
        <p className="mt-0.5 text-xs text-slate-600">Pair learning with a paid path — or your own business.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Link href="/apprenticeships" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700">Apprenticeships <ArrowRight className="h-3.5 w-3.5" /></Link>
          <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700">Find a job <ArrowRight className="h-3.5 w-3.5" /></Link>
          <Link href="/entrepreneurship" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700">Be your own boss <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      <p className="mt-4 mb-2 text-center text-[11px] text-slate-400">
        Costs and offerings change — always check the site. A free SCORE mentor or job center can help you pick the credential that actually leads to a job.
      </p>
    </div>
  );
}

function LearnCard({ r }: { r: LearnResource }) {
  const meta = LEARN_COST_META[r.cost];
  return (
    <li className="flex flex-col rounded-xl border border-slate-200 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-navy-900">{r.name}</h3>
        <span className={'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' + COST_PILL[meta.tone]}>{meta.label}</span>
      </div>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{r.desc}</p>
      {r.reentryFriendly && (
        <p className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">Built for second chances</p>
      )}
      <p className="mt-1.5 text-[10px] text-slate-400">{r.source}</p>
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
        Open <ExternalLink className="h-3 w-3" />
      </a>
    </li>
  );
}
