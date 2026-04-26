'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HardHat, GraduationCap, Wallet, ShieldCheck, ArrowRight, MapPin, Building2, Clock,
} from 'lucide-react';
import type { JobDto, PaginatedJobsDto } from '@dxp/shared';
import { listJobs } from '../../lib/api';
import { RiskBadge } from '../../components/RiskBadge';
import { SourceBadge } from '../../components/SourceBadge';
import { JobRowSkeleton } from '../../components/Skeleton';
import { prettyDate, prettyIndustry, prettySalary } from '../../lib/format';

const PAGE_SIZE = 25;

/**
 * Dedicated landing for apprenticeships — a critical pathway for
 * fair-chance candidates. Apprenticeships pay while training, often sidestep
 * traditional background-check gates, and lead to union-scale wages.
 */
export default function ApprenticeshipsPage() {
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isFirstPage = offset === 0;
    if (isFirstPage) setLoading(true); else setLoadingMore(true);
    setError(null);
    listJobs({ apprenticeshipsOnly: true, limit: PAGE_SIZE, offset })
      .then((d: PaginatedJobsDto) => {
        setTotal(d.total);
        setJobs((prev) => (isFirstPage ? d.results : [...prev, ...d.results]));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, [offset]);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sunset-50 text-sunset-700">
            <HardHat className="h-7 w-7" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sunset-700">Pathway spotlight</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">Apprenticeships</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Earn-while-you-learn roles — a clear pathway into the skilled trades, often with
              lower background-check scrutiny and union-scale wages on completion.
            </p>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat Icon={Wallet}       label="Paid training"     text="Full wages from day one, no tuition debt." />
          <Stat Icon={ShieldCheck}  label="Fair-chance leaning" text="Many programs accept applicants with records." />
          <Stat Icon={GraduationCap} label="Credentialed exit" text="Finish with a portable, industry-recognized cert." />
        </dl>
      </section>

      {/* Listings */}
      <div className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-navy-900">
            Open apprenticeship roles
            <span className="ml-2 text-sm font-medium text-slate-500">({total.toLocaleString()})</span>
          </h2>
          <Link
            href="/jobs"
            className="text-xs font-medium text-teal-700 hover:text-teal-800"
          >
            Browse all jobs →
          </Link>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>
        )}

        {loading ? (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            {Array.from({ length: 5 }).map((_, i) => <JobRowSkeleton key={i} />)}
          </ul>
        ) : jobs.length === 0 ? (
          <ApprenticeshipEmptyState />
        ) : (
          <>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              {jobs.map((job) => <ApprenticeshipRow key={job.id} job={job} />)}
            </ul>
            {jobs.length < total && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setOffset(jobs.length)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : `Load more (${(total - jobs.length).toLocaleString()} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pre-apprenticeship / resources callout */}
      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-base font-semibold text-navy-900">Not ready to apply yet?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pre-apprenticeship programs build foundational skills (OSHA 10, basic math, tool
          proficiency) and hand off into registered apprenticeships. Ask your caseworker about
          local options — they're often free and open to people with records.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ResourceChip label="Apprenticeship.gov" href="https://www.apprenticeship.gov/" />
          <ResourceChip label="CareerOneStop Apprenticeship Finder" href="https://www.careeronestop.org/toolkit/training/find-apprenticeships.aspx" />
          <ResourceChip label="U.S. DOL Office of Apprenticeship" href="https://www.dol.gov/agencies/eta/apprenticeship" />
        </div>
      </section>
    </div>
  );
}

type LucideIcon = typeof HardHat;

function Stat({ Icon, label, text }: { Icon: LucideIcon; label: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-700">{text}</p>
    </div>
  );
}

function ApprenticeshipRow({ job }: { job: JobDto }) {
  const cityRegion = [job.locationCity, job.locationRegion].filter(Boolean).join(', ');
  const salary = prettySalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  return (
    <li className="transition hover:bg-slate-50">
      <Link href={`/jobs/${job.id}`} className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-navy-900 hover:text-teal-700">{job.title}</h3>
            <SourceBadge code={job.sourceCode} />
            <span className="inline-flex items-center gap-1 rounded-full border border-sunset-200 bg-sunset-50 px-2 py-0.5 text-[11px] font-medium text-sunset-700">
              <HardHat className="h-3 w-3" /> Apprenticeship
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-800">{job.company}</span>
            <span className="text-slate-300">·</span>
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span>{cityRegion || 'Location TBD'}</span>
            <span className="text-slate-300">·</span>
            <span className="capitalize">{prettyIndustry(job.industry)}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            {job.postedAt && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {prettyDate(job.postedAt)}</span>}
            {salary && <span className="font-medium text-teal-700 inline-flex items-center gap-1"><Wallet className="h-3 w-3" />{salary}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <RiskBadge tier={job.riskTier} backgroundCheckLikely={job.backgroundCheckLikely} />
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">View <ArrowRight className="h-3 w-3" /></span>
        </div>
      </Link>
    </li>
  );
}

function ResourceChip({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-teal-400 hover:text-teal-700"
    >
      {label} ↗
    </a>
  );
}

/**
 * Helpful empty state for when no live apprenticeships match the current
 * search. Apprenticeships are discoverable through many channels outside
 * a job board (workforce boards, union halls, AJCs, pre-apprenticeship
 * programs) — surface those instead of dead-ending the user.
 */
function ApprenticeshipEmptyState() {
  return (
    <div className="space-y-4">
      {/* Headline + body */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card sm:p-10">
        <p className="text-base font-semibold text-navy-900">
          No live apprenticeship postings found in this search yet.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Apprenticeships may still be available through local workforce boards, union training
          centers, pre-apprenticeship programs, and American Job Centers. Below are concrete
          next steps you can take today.
        </p>
      </div>

      {/* Four-card grid of next steps */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* 1. Search related entry-level jobs */}
        <NextStepCard
          eyebrow="Step 1"
          title="Search related entry-level jobs"
          body="Build experience and credentials in roles that often hire while you wait for an apprenticeship slot."
        >
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { label: 'Construction Helper', q: 'construction helper' },
              { label: 'Warehouse Trainee', q: 'warehouse trainee' },
              { label: 'Manufacturing Assistant', q: 'manufacturing assistant' },
              { label: 'General Laborer', q: 'general laborer' },
              { label: 'Maintenance Assistant', q: 'maintenance assistant' },
            ].map(({ label, q }) => (
              <Link
                key={q}
                href={`/jobs?q=${encodeURIComponent(q)}`}
                className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-800 hover:bg-teal-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </NextStepCard>

        {/* 2. Local workforce support */}
        <NextStepCard
          eyebrow="Step 2"
          title="Find local workforce support"
          body="Free in-person help with applications, training referrals, and apprenticeship office contacts."
        >
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link href="/local-help" className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700 hover:border-teal-400 hover:text-teal-700">
              American Job Centers
            </Link>
            <a href="https://www.dol.gov/agencies/eta/apprenticeship/contact" target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700 hover:border-teal-400 hover:text-teal-700">
              State apprenticeship office ↗
            </a>
            <a href="https://www.apprenticeship.gov/finder/listings" target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700 hover:border-teal-400 hover:text-teal-700">
              Apprenticeship.gov ↗
            </a>
          </div>
        </NextStepCard>

        {/* 3. Build readiness */}
        <NextStepCard
          eyebrow="Step 3"
          title="Build readiness"
          body="Most apprenticeship sponsors expect basic safety credentials and a reliable application packet."
        >
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            <li>• OSHA 10 (construction) or OSHA 30</li>
            <li>• Driver&rsquo;s license review and clean driving record where required</li>
            <li>• Resume preparation (highlight transferable skills)</li>
            <li>• Interview practice (common questions, calm tone)</li>
            <li>• Background explanation statement (see <Link href="/background-statement" className="font-medium text-teal-700 hover:underline">Prepare Background Explanation</Link>)</li>
          </ul>
        </NextStepCard>

        {/* 4. Caseworker action */}
        <NextStepCard
          eyebrow="Step 4"
          title="Caseworker action"
          body="If you&rsquo;re working with a caseworker or reentry coordinator, document this pathway and review it together."
        >
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            <li>• Save this readiness plan</li>
            <li>• <Link href="/caseworker" className="font-medium text-teal-700 hover:underline">Open Caseworker Mode</Link> to print the 30/60/90 plan</li>
            <li>• Review local pre-apprenticeship programs together</li>
          </ul>
        </NextStepCard>
      </div>
    </div>
  );
}

function NextStepCard({
  eyebrow, title, body, children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sunset-700">{eyebrow}</p>
      <h3 className="mt-1 text-sm font-semibold text-navy-900">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
      {children}
    </div>
  );
}
