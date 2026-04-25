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
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
            <p className="text-sm font-semibold text-navy-900">No apprenticeships in the pool right now.</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-600">
              Our providers ingest by keyword — run an ingestion cycle or check back after the
              next refresh. Federal apprenticeships tend to post on USAJobs.
            </p>
          </div>
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
