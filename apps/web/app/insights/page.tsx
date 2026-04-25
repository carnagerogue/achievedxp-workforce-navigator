'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3, MapPin, Factory, Database, Wallet, ShieldCheck, Radio, Clock,
  Sparkles, AlertCircle,
} from 'lucide-react';
import type { JobsStatsDto } from '@dxp/shared';
import { getJobsStats } from '../../lib/api';
import { HorizontalBarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { Skeleton } from '../../components/Skeleton';
import { StateCoverage } from '../../components/StateCoverage';

/**
 * Market-level view of the current job catalog. Pulls everything from a
 * single /jobs/stats call and renders bars + donuts. Intended audience:
 * caseworkers, policy folks, and power users who want the big picture
 * before drilling into individual postings.
 */
export default function InsightsPage() {
  const [data, setData] = useState<JobsStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Risk donut colors tuned to the tier: LOW teal, MEDIUM amber, HIGH rose.
  const RISK_COLORS: Record<string, string> = {
    LOW: '#0f8a82', MEDIUM: '#b45309', HIGH: '#be123c',
  };
  const riskSlices = data.byRiskTier.map((r) => ({
    ...r, color: RISK_COLORS[r.key] ?? '#64748b',
  }));

  const SOURCE_COLORS: Record<string, string> = {
    usajobs:  '#283558',
    adzuna:   '#0f8a82',
    remotive: '#f55b1d',
    mock:     '#94a3b8',
  };
  const sourceSlices = data.bySource.map((s) => ({
    ...s, color: SOURCE_COLORS[s.key] ?? '#6e82bc',
  }));

  return (
    <div className="animate-fade-in">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <Sparkles className="h-3.5 w-3.5" /> Market Insights
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          What the job market looks like right now
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Aggregate view of every active posting we've ingested. Use it to spot trends in
          hiring, salary bands, and fair-chance friendliness before drilling into individual jobs.
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard Icon={Database}     label="Active jobs"      value={totals.active.toLocaleString()} tone="teal" />
          <KpiCard Icon={ShieldCheck}  label="Fair-chance %"    value={`${fairPct}%`} sub={`${totals.fairChanceFriendly.toLocaleString()} of ${totals.active.toLocaleString()}`} tone="teal" />
          <KpiCard Icon={Radio}        label="Remote roles"     value={`${remotePct}%`} sub={totals.remote.toLocaleString()} tone="sunset" />
          <KpiCard Icon={Clock}        label="Posted last 7d"   value={totals.postedLast7Days.toLocaleString()} sub={`${totals.postedLast30Days.toLocaleString()} in 30d`} tone="navy" />
        </dl>
      </div>

      {/* ─── State coverage (full width) ─── */}
      <div className="mb-6">
        <StateCoverage regions={data.byRegion} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel Icon={Factory} title="Top hiring industries" subtitle="Active postings per canonical industry tag.">
          <HorizontalBarChart data={data.byIndustry} tone="teal" />
        </Panel>

        <Panel Icon={MapPin} title="Top hiring states" subtitle="Two-letter USPS codes — US postings only.">
          <HorizontalBarChart data={data.byRegion} tone="navy" />
        </Panel>

        <Panel Icon={Wallet} title="Salary distribution" subtitle={`${totals.withSalary.toLocaleString()} postings have salary data.`}>
          <HorizontalBarChart data={data.salaryBands.map((b) => ({ key: b.label, label: b.label, count: b.count }))} tone="sunset" />
        </Panel>

        <Panel Icon={Database} title="Sources" subtitle="Where the postings come from.">
          <DonutChart slices={sourceSlices} size={140} centerLabel="total" centerValue={totals.active.toLocaleString()} />
        </Panel>

        <Panel Icon={ShieldCheck} title="Risk tier split" subtitle="Classifier-assigned scrutiny level.">
          <DonutChart slices={riskSlices} size={140} centerLabel="of active" centerValue={`${totals.active.toLocaleString()}`} />
        </Panel>

        <Panel Icon={BarChart3} title="Most-demanded certifications" subtitle="Required across the catalog — great candidates for a training plan.">
          <HorizontalBarChart data={data.topCertifications} tone="amber" />
        </Panel>

        <Panel Icon={BarChart3} title="Most-demanded skills" subtitle="Listed as required skills on active postings.">
          <HorizontalBarChart data={data.topSkills} tone="teal" />
        </Panel>
      </div>
    </div>
  );
}

// ───────── pieces ─────────

type LucideIcon = typeof BarChart3;

function KpiCard({
  Icon, label, value, sub, tone,
}: { Icon: LucideIcon; label: string; value: string; sub?: string; tone: 'teal' | 'sunset' | 'navy' }) {
  const iconCls =
    tone === 'teal'   ? 'bg-teal-50   text-teal-700'
    : tone === 'sunset' ? 'bg-sunset-50 text-sunset-700'
    :                     'bg-navy-50   text-navy-700';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <dt className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tracking-tight text-navy-900">{value}</dd>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function Panel({
  Icon, title, subtitle, children,
}: { Icon: LucideIcon; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-navy-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
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
