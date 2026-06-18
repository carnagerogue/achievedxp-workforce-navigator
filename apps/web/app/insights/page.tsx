'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3, MapPin, Factory, Database, Wallet, ShieldCheck, Radio,
  Sparkles, AlertCircle, ArrowRight, Clock, HardHat, GraduationCap, UserCircle2,
} from 'lucide-react';
import type { JobsStatsDto } from '@dxp/shared';
import { getJobsStats } from '../../lib/api';
import { getUserId } from '../../lib/session';
import { HorizontalBarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { Skeleton } from '../../components/Skeleton';
import { StateCoverage } from '../../components/StateCoverage';

/**
 * "Where to focus your search" — an actionable launchpad, not a passive
 * dashboard. Every number, state, industry, and skill is a doorway into the
 * filtered job catalog, and a personalized banner points the user to their
 * own ranked matches.
 */
export default function InsightsPage() {
  const [data, setData] = useState<JobsStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => { setHasProfile(Boolean(getUserId())); }, []);
  useEffect(() => {
    getJobsStats()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;
  if (!data)   return null;

  const { totals } = data;
  const fairPct   = totals.active === 0 ? 0 : Math.round((totals.fairChanceFriendly / totals.active) * 100);
  const remotePct = totals.active === 0 ? 0 : Math.round((totals.remote / totals.active) * 100);

  const RISK_COLORS: Record<string, string> = { LOW: '#0f8a82', MEDIUM: '#b45309', HIGH: '#be123c' };
  const riskSlices = data.byRiskTier.map((r) => ({ ...r, color: RISK_COLORS[r.key] ?? '#64748b' }));
  const SOURCE_COLORS: Record<string, string> = { usajobs: '#283558', adzuna: '#0f8a82', remotive: '#f55b1d', mock: '#94a3b8' };
  const sourceSlices = data.bySource.map((s) => ({ ...s, color: SOURCE_COLORS[s.key] ?? '#6e82bc' }));

  return (
    <div className="animate-fade-in">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <Sparkles className="h-3.5 w-3.5" /> Where to focus
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          Where the jobs are right now
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {totals.active.toLocaleString()} active openings, {fairPct}% fair-chance friendly. Tap any number,
          state, industry, or skill below to jump straight into matching jobs.
        </p>

        {/* Personalized doorway */}
        <Link
          href={hasProfile ? '/dashboard' : '/onboarding'}
          className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-teal-50/70 px-5 py-4 transition hover:border-teal-300 hover:bg-teal-50"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
              <UserCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-900">
                {hasProfile ? 'See jobs ranked for you' : 'Get jobs ranked for your background'}
              </p>
              <p className="text-xs text-slate-600">
                {hasProfile
                  ? 'Your dashboard scores every posting against your conviction, skills, and location.'
                  : 'Build a quick profile and we’ll surface your strongest, most realistic matches.'}
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-700">
            {hasProfile ? 'Open dashboard' : 'Build my profile'} <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        {/* Quick-start doorways */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Doorway Icon={ShieldCheck} label="Fair-chance jobs" value={totals.fairChanceFriendly.toLocaleString()} sub={`${fairPct}% of all`} href="/jobs?hideFelonExclusions=true" tone="teal" />
          <Doorway Icon={Clock} label="New this week" value={totals.postedLast7Days.toLocaleString()} sub={`${totals.postedLast30Days.toLocaleString()} in 30d`} href="/jobs?postedWithinDays=7" tone="navy" />
          <Doorway Icon={Radio} label="Remote roles" value={totals.remote.toLocaleString()} sub={`${remotePct}% of all`} href="/jobs?remote=true" tone="sunset" />
          <Doorway Icon={HardHat} label="Apprenticeships" value={totals.apprenticeships.toLocaleString()} sub="earn while you learn" href="/jobs?apprenticeshipsOnly=true" tone="teal" />
        </div>
      </div>

      {/* ─── State coverage (already click-to-filter) ─── */}
      <div className="mb-6">
        <StateCoverage regions={data.byRegion} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel Icon={Factory} title="Industries hiring now" subtitle="Tap an industry to browse its openings." href="/jobs">
          <HorizontalBarChart data={data.byIndustry} tone="teal" hrefFor={(d) => `/jobs?industry=${encodeURIComponent(d.key)}`} />
        </Panel>

        <Panel Icon={MapPin} title="States with the most openings" subtitle="Tap a state to filter the catalog." href="/jobs">
          <HorizontalBarChart data={data.byRegion} tone="navy" hrefFor={(d) => `/jobs?region=${encodeURIComponent(d.key)}`} />
        </Panel>

        <Panel Icon={GraduationCap} title="Skills that unlock the most jobs" subtitle="In-demand across the catalog — add one, then browse the jobs that want it.">
          <HorizontalBarChart data={data.topSkills} tone="teal" hrefFor={(d) => `/jobs?q=${encodeURIComponent(d.key)}`} />
        </Panel>

        <Panel Icon={BarChart3} title="Certifications worth earning" subtitle="Required most often — strong candidates for a training plan.">
          <HorizontalBarChart data={data.topCertifications} tone="amber" hrefFor={(d) => `/jobs?q=${encodeURIComponent(d.key)}`} />
        </Panel>

        <Panel Icon={Wallet} title="Browse by pay" subtitle={`${totals.withSalary.toLocaleString()} postings list salary. Tap a band to filter.`}>
          <HorizontalBarChart
            data={data.salaryBands.map((b) => ({ key: String(b.min ?? 0), label: b.label, count: b.count }))}
            tone="sunset"
            hrefFor={(d) => (Number(d.key) > 0 ? `/jobs?minSalary=${d.key}` : '/jobs')}
          />
        </Panel>

        <Panel Icon={ShieldCheck} title="Most postings are lower-scrutiny" subtitle="Classifier-assigned risk tier — lower tiers are usually the most fair-chance friendly.">
          <DonutChart slices={riskSlices} size={140} centerLabel="of active" centerValue={`${totals.active.toLocaleString()}`} />
        </Panel>

        <Panel Icon={Database} title="Where these jobs come from" subtitle="Live feeds we aggregate.">
          <DonutChart slices={sourceSlices} size={140} centerLabel="total" centerValue={totals.active.toLocaleString()} />
        </Panel>
      </div>
    </div>
  );
}

// ───────── pieces ─────────

type LucideIcon = typeof BarChart3;

function Doorway({
  Icon, label, value, sub, href, tone,
}: { Icon: LucideIcon; label: string; value: string; sub?: string; href: string; tone: 'teal' | 'sunset' | 'navy' }) {
  const iconCls =
    tone === 'teal'   ? 'bg-teal-50   text-teal-700'
    : tone === 'sunset' ? 'bg-sunset-50 text-sunset-700'
    :                     'bg-navy-50   text-navy-700';
  return (
    <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600" />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-navy-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </Link>
  );
}

function Panel({
  Icon, title, subtitle, href, children,
}: { Icon: LucideIcon; title: string; subtitle?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-navy-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {href && (
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
            Browse all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-10 w-3/5" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-rose-900">
        <AlertCircle className="h-5 w-5" /> Couldn't load stats
      </h2>
      <p className="mt-2 text-sm text-rose-800">{message}</p>
    </div>
  );
}
