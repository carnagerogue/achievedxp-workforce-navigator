'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, ArrowRight, Printer, AlertTriangle, CheckCircle2, Wrench, Users, Calendar, FileText } from 'lucide-react';
import {
  scoreJobCompatibility,
  buildTrainingBridge,
  USER_CONTEXT_OPTIONS,
  CONVICTION_LABELS,
  CONVICTION_TYPE_ORDER,
  type ConvictionType,
  type CompatibilityRating,
  type JobInput,
  type UserContextMode,
  type TrainingBridgeStep,
} from '@dxp/shared';
import type { JobDto } from '@dxp/shared';
import { listJobs } from '../../lib/api';

/**
 * Caseworker Mode — a single-page assemble-everything view designed for
 * staff helping a participant choose realistic employment + training
 * pathways.
 *
 * Inputs are plain form fields (no profile required) so a caseworker
 * can plug in a candidate's situation in 30 seconds and get:
 *   - Top 10 recommended jobs (re-scored against their conviction)
 *   - Roles that may waste time
 *   - Training gaps + recommended steps
 *   - 30/60/90-day plan (also exportable via /caseworker/plan)
 *   - A free-form notes field
 */
export default function CaseworkerPage() {
  // Form inputs
  const [name, setName] = useState('');
  const [conviction, setConviction] = useState<ConvictionType>('other');
  const [contextMode, setContextMode] = useState<UserContextMode>('in_the_community');
  const [location, setLocation] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [notes, setNotes] = useState('');

  // Pulled jobs
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listJobs({ postalCode: location && /^\d{5}$/.test(location.trim()) ? location.trim() : undefined, limit: 100 })
      .then((d) => setJobs(d.results))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [location]);

  // Score every visible job against the selected conviction.
  const scored = useMemo(() => {
    return jobs.map((j) => {
      const job: JobInput = mapJob(j);
      const rating = scoreJobCompatibility({ convictionType: conviction }, job);
      return { job, source: j, rating };
    }).sort((a, b) => b.rating.score - a.rating.score);
  }, [jobs, conviction]);

  const top = scored.filter((x) => x.rating.chance !== 'low').slice(0, 10);
  const wasteTime = scored.filter((x) => x.rating.chance === 'low').slice(0, 6);

  // Aggregated training gaps across the top 10
  const aggregatedSteps = useMemo(() => {
    const map = new Map<string, TrainingBridgeStep>();
    for (const { job } of top) {
      const bridge = buildTrainingBridge({ convictionType: conviction }, job);
      for (const s of bridge.steps) if (!map.has(s.id)) map.set(s.id, s);
    }
    return Array.from(map.values());
  }, [top, conviction]);

  // Day-30/60/90 plan (simplified version of the data assembled in @dxp/shared/career-action-plan)
  const phases = useMemo(() => buildSimplePhases(contextMode, aggregatedSteps, top.length), [contextMode, aggregatedSteps, top.length]);

  // Save inputs to localStorage so the print page can read them.
  const saveAndPrint = () => {
    const payload = { name, conviction, contextMode, location, careerGoal, notes, generatedAt: new Date().toISOString(), top, aggregatedSteps, phases };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dxp:caseworker:plan', JSON.stringify(payload));
      window.open('/caseworker/plan', '_blank');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy-700">
            <ClipboardList className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-700">Staff view</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">Caseworker Mode</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Plug in a participant&rsquo;s situation and get top recommended jobs, training gaps, and a
              printable 30/60/90-day career plan.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Participant name (optional)">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First or initials"
              className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </Field>
          <Field label="Conviction class">
            <select
              value={conviction}
              onChange={(e) => setConviction(e.target.value as ConvictionType)}
              className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {CONVICTION_TYPE_ORDER.map((c) => (
                <option key={c} value={c}>{CONVICTION_LABELS[c]}</option>
              ))}
            </select>
          </Field>
          <Field label="Context">
            <select
              value={contextMode}
              onChange={(e) => setContextMode(e.target.value as UserContextMode)}
              className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {USER_CONTEXT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="ZIP (optional)">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 43215"
              className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </Field>
          <Field label="Career goal (optional)">
            <input
              type="text"
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="e.g. CDL-A driver, journey carpenter"
              className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Caseworker notes">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Stable transportation, finished GED in 2024, …"
                className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </Field>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={saveAndPrint}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
          >
            <Printer className="h-3.5 w-3.5" /> Generate printable plan
          </button>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700"
          >
            Browse all jobs <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Two-column results */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Left: top + waste */}
        <div className="space-y-4">
          <Panel title="Top recommended jobs" icon={<CheckCircle2 className="h-4 w-4 text-emerald-700" />} count={top.length}>
            {loading && <p className="text-xs text-slate-500">Loading jobs…</p>}
            {!loading && top.length === 0 && <p className="text-xs text-slate-500">No qualifying matches yet — try a broader location.</p>}
            <ul className="space-y-2">
              {top.map(({ source, rating }) => (
                <RecommendedJobLi key={source.id} job={source} rating={rating} />
              ))}
            </ul>
          </Panel>

          <Panel title="May require additional review before applying" icon={<AlertTriangle className="h-4 w-4 text-rose-700" />} count={wasteTime.length}>
            <p className="mb-2 text-xs text-slate-600">These roles likely conflict with the selected conviction class. Surface only after caseworker review.</p>
            <ul className="space-y-2">
              {wasteTime.map(({ source, rating }) => (
                <WasteJobLi key={source.id} job={source} rating={rating} />
              ))}
            </ul>
          </Panel>
        </div>

        {/* Right: training gaps + 30/60/90 */}
        <div className="space-y-4">
          <Panel title="Training gaps" icon={<Wrench className="h-4 w-4 text-teal-700" />} count={aggregatedSteps.length}>
            {aggregatedSteps.length === 0 ? (
              <p className="text-xs text-slate-500">No common gaps detected across the top matches.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {aggregatedSteps.slice(0, 6).map((s) => (
                  <li key={s.id} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                    <p className="font-medium text-slate-800">{s.title}</p>
                    <p className="text-[11px] text-slate-600">{s.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="30 / 60 / 90-day plan" icon={<Calendar className="h-4 w-4 text-navy-700" />}>
            {phases.map((phase) => (
              <div key={phase.label} className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{phase.label}</p>
                <ul className="mt-1 space-y-1">
                  {phase.actions.map((a, i) => (
                    <li key={i} className="text-xs text-slate-700">• {a}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Panel>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <p className="flex items-center gap-1.5 font-semibold"><FileText className="h-3.5 w-3.5" /> Tip</p>
            <p className="mt-1">After reviewing the participant&rsquo;s situation, click <strong>Generate printable plan</strong> to open a one-page printable Career Action Plan.</p>
          </div>
        </div>
      </div>

      {/* Participant summary footer */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600 shadow-card">
        <p className="flex items-center gap-1.5 font-semibold text-slate-800"><Users className="h-3.5 w-3.5" /> Participant summary</p>
        <p className="mt-1">
          Name: <strong>{name || '—'}</strong> · Conviction: <strong>{CONVICTION_LABELS[conviction]}</strong> ·
          Context: <strong>{USER_CONTEXT_OPTIONS.find((o) => o.value === contextMode)?.label}</strong> ·
          Location: <strong>{location || 'any'}</strong> · Goal: <strong>{careerGoal || '—'}</strong>
        </p>
      </section>
    </div>
  );
}

// ─── helpers ───

function mapJob(j: JobDto): JobInput {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    description: j.description,
    industry: j.industry,
    riskTier: j.riskTier,
    excludesFelons: j.excludesFelons,
    backgroundCheckLikely: j.backgroundCheckLikely,
    isApprenticeship: j.isApprenticeship,
    remote: j.remote,
    locationRegion: j.locationRegion,
    locationCity: j.locationCity,
    requiredSkills: j.requiredSkills,
    requiredCertifications: j.requiredCertifications,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Panel({ title, icon, count, children }: { title: string; icon: React.ReactNode; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-navy-900">
        {icon} {title}
        {count !== undefined && <span className="text-[11px] font-normal text-slate-500">({count})</span>}
      </h2>
      {children}
    </section>
  );
}

function RecommendedJobLi({ job, rating }: { job: JobDto; rating: CompatibilityRating }) {
  const styles = rating.chance === 'high' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <li className="rounded-md border border-slate-200 bg-white p-2.5">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/jobs/${job.id}`} className="min-w-0 text-sm font-medium text-navy-900 hover:text-teal-700 truncate">
          {job.title}
        </Link>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles}`}>
          {rating.label} · {rating.score}%
        </span>
      </div>
      <p className="text-[11px] text-slate-600 truncate">{job.company} · {[job.locationCity, job.locationRegion].filter(Boolean).join(', ') || 'Location TBD'}</p>
      <p className="mt-1 line-clamp-2 text-[11px] text-slate-700"><strong>Why:</strong> {rating.summary}</p>
      {rating.possibleBarriers[0] && (
        <p className="mt-0.5 text-[11px] text-rose-700"><strong>Watch:</strong> {rating.possibleBarriers[0]}</p>
      )}
      <p className="mt-0.5 text-[11px] text-slate-700"><strong>Next:</strong> {rating.recommendedNextStep}</p>
    </li>
  );
}

function WasteJobLi({ job, rating }: { job: JobDto; rating: CompatibilityRating }) {
  return (
    <li className="rounded-md border border-rose-100 bg-rose-50/50 p-2.5">
      <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-navy-900 hover:text-teal-700">{job.title}</Link>
      <p className="text-[11px] text-slate-600">{job.company} · {rating.score}%</p>
      {rating.possibleBarriers[0] && <p className="mt-0.5 text-[11px] text-rose-700">{rating.possibleBarriers[0]}</p>}
    </li>
  );
}

function buildSimplePhases(
  contextMode: UserContextMode,
  steps: TrainingBridgeStep[],
  topCount: number,
): Array<{ label: string; actions: string[] }> {
  const certs = steps.filter((s) => s.kind === 'certification' || s.kind === 'license');
  const day30: string[] = [];
  const day60: string[] = [];
  const day90: string[] = [];

  if (contextMode === 'currently_incarcerated') {
    day30.push('Update resume with in-facility career staff', 'Identify release area + closest American Job Center');
    if (certs[0]) day30.push(`Begin in-facility training: ${certs[0].title}`);
  } else if (contextMode === 'preparing_for_release') {
    day30.push(`Apply to ${Math.min(5, topCount)} Strong Match jobs in release area`, 'Gather identity documents');
    if (certs[0]) day30.push(`Start ${certs[0].title}`);
  } else if (contextMode === 'recently_released') {
    day30.push(`Apply to ${Math.min(5, topCount)} Strong Match jobs this week`, 'Visit local American Job Center');
    if (certs[0]) day30.push(`Start ${certs[0].title}`);
  } else if (contextMode === 'on_supervision') {
    day30.push('Confirm permitted industries / hours with supervising officer', `Apply to ${Math.min(5, topCount)} Strong Match jobs that fit conditions`);
  } else {
    day30.push(`Apply to ${Math.min(5, topCount)} Strong Match jobs`, 'Refresh resume with any new credentials');
    if (certs[0]) day30.push(`Start ${certs[0].title}`);
  }

  if (certs[0]) day60.push(`Complete ${certs[0].title}`);
  if (certs[1]) day60.push(`Begin ${certs[1].title}`);
  day60.push('Apply to additional Possible Match roles', 'Attend one local hiring event or workforce-board orientation');

  if (certs[1]) day90.push(`Complete ${certs[1].title}`);
  day90.push('Target apprenticeships or higher-wage roles unlocked by new credentials', 'Review progress with caseworker');

  return [
    { label: '30 days', actions: day30 },
    { label: '60 days', actions: day60 },
    { label: '90 days', actions: day90 },
  ];
}
