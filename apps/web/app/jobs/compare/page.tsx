'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ExternalLink, Building2, MapPin, Wallet, Clock, Briefcase,
  Wrench, GraduationCap, X, GitCompare, Target,
} from 'lucide-react';
import type { JobDto } from '@dxp/shared';
import { getJobsByIds } from '../../../lib/api';
import { useCompareIds, toggleCompare, clearCompare } from '../../../lib/personal-store';
import { RiskBadge } from '../../../components/RiskBadge';
import { SourceBadge } from '../../../components/SourceBadge';
import { prettyDate, prettyIndustry, prettySalary } from '../../../lib/format';
import { getLocalProfile } from '../../../lib/local-profile';
import { candidateProfilesFromStored, convictionTypesFor, type StoredProfile } from '../../../lib/profile-store';
import { scoreJobUnified } from '../../../lib/job-scoring';

const CHANCE_CHIP: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-teal-50 text-teal-700 ring-teal-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-rose-50 text-rose-700 ring-rose-200',
};

/**
 * Side-by-side comparison for up to 3 jobs. The source of truth is the
 * localStorage compare set; we hydrate full job records from the API each
 * time the set changes so we always show fresh data.
 */
export default function ComparePage() {
  const ids = useCompareIds();
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<StoredProfile | null>(null);

  useEffect(() => {
    if (ids.length === 0) { setJobs([]); return; }
    setLoading(true);
    getJobsByIds(ids)
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [ids]);

  useEffect(() => { setProfile(getLocalProfile()); }, []);

  // Same conviction-aware scorer as Browse + the dashboard, so the one
  // dimension that matters most here is front-and-center, not absent.
  const scoreInputs = useMemo(() => ({
    candidates: profile ? candidateProfilesFromStored(profile) : [],
    convictionTypes: profile ? convictionTypesFor(profile) : [],
    profile,
    hasConvictions: (profile?.convictions?.length ?? 0) > 0,
  }), [profile]);
  const scoreByJob = useMemo(() => {
    const m = new Map<string, ReturnType<typeof scoreJobUnified>>();
    if (!profile) return m;
    for (const j of jobs) m.set(j.id, scoreJobUnified(scoreInputs, j));
    return m;
  }, [jobs, scoreInputs, profile]);

  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-xl animate-fade-in rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sunset-50 text-sunset-700">
          <GitCompare className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-navy-900">Your compare list is empty</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          Add up to 3 jobs from the Browse page using the compare icon, then come back here to
          see them side-by-side.
        </p>
        <Link
          href="/jobs"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Browse jobs →
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/jobs" className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to jobs
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Compare jobs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Side-by-side on the fields that matter — your match, location, salary, requirements, and risk.
          </p>
        </div>
        <button
          type="button"
          onClick={clearCompare}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" /> Clear all
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `160px repeat(${jobs.length}, minmax(0, 1fr))` }}
            >
              {/* Row labels for the first pseudo-column render in each row below. */}
              <Row label="">
                {jobs.map((j) => (
                  <div key={j.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                    <div className="flex items-start justify-between gap-2">
                      <SourceBadge code={j.sourceCode} />
                      <button
                        type="button"
                        onClick={() => toggleCompare(j.id)}
                        className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Remove from compare"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Link
                      href={`/jobs/${j.id}`}
                      className="mt-2 block text-base font-semibold leading-snug text-navy-900 hover:text-teal-700"
                    >
                      {j.title}
                    </Link>
                    <p className="mt-1 truncate text-xs text-slate-600">{j.company}</p>
                    <a
                      href={j.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
                    >
                      Apply <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </Row>

              <Row label="Your match" Icon={Target} accent>
                {jobs.map((j) => {
                  const u = scoreByJob.get(j.id);
                  if (!u) {
                    return (
                      <div key={j.id} className="pt-4 text-sm">
                        <Link href="/onboarding" className="text-xs font-semibold text-teal-700 hover:underline">Build a profile to score →</Link>
                      </div>
                    );
                  }
                  return (
                    <div key={j.id} className="pt-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${CHANCE_CHIP[u.chance]}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" /> {u.label} · {u.score}%
                      </span>
                      <p className="mt-1.5 text-[11px] leading-snug text-slate-600">{u.explanation}</p>
                    </div>
                  );
                })}
              </Row>

              <Row label="Location" Icon={MapPin}>
                {jobs.map((j) => (
                  <Cell key={j.id}>
                    {[j.locationCity, j.locationRegion, j.locationPostalCode].filter(Boolean).join(', ') || '—'}
                  </Cell>
                ))}
              </Row>

              <Row label="Industry" Icon={Building2}>
                {jobs.map((j) => <Cell key={j.id}>{prettyIndustry(j.industry)}</Cell>)}
              </Row>

              <Row label="Employment" Icon={Briefcase}>
                {jobs.map((j) => <Cell key={j.id}>{j.employmentType.replace('_', ' ').toLowerCase()}</Cell>)}
              </Row>

              <Row label="Salary" Icon={Wallet} accent>
                {jobs.map((j) => (
                  <Cell key={j.id} accent={!!(j.salaryMin || j.salaryMax)}>
                    {prettySalary(j.salaryMin, j.salaryMax, j.salaryCurrency) ?? <Muted>not disclosed</Muted>}
                  </Cell>
                ))}
              </Row>

              <Row label="Posted" Icon={Clock}>
                {jobs.map((j) => <Cell key={j.id}>{j.postedAt ? prettyDate(j.postedAt) : '—'}</Cell>)}
              </Row>

              <Row label="Risk" Icon={Building2}>
                {jobs.map((j) => (
                  <Cell key={j.id}>
                    <RiskBadge tier={j.riskTier} backgroundCheckLikely={j.backgroundCheckLikely} />
                  </Cell>
                ))}
              </Row>

              <Row label="Clean-record" Icon={Building2}>
                {jobs.map((j) => (
                  <Cell key={j.id}>
                    {j.excludesFelons
                      ? <span className="text-rose-700 font-medium">Required</span>
                      : j.classification?.excludesFelons.confidence === 'verified'
                        ? <span className="text-teal-700 font-medium">Not required in posting</span>
                        : <span className="text-slate-600 font-medium">Not stated — verify</span>}
                  </Cell>
                ))}
              </Row>

              <Row label="Required skills" Icon={Wrench}>
                {jobs.map((j) => (
                  <Cell key={j.id}>
                    {j.requiredSkills.length === 0 ? <Muted>none listed</Muted> : (
                      <ChipList items={j.requiredSkills} />
                    )}
                  </Cell>
                ))}
              </Row>

              <Row label="Certifications" Icon={GraduationCap}>
                {jobs.map((j) => (
                  <Cell key={j.id}>
                    {j.requiredCertifications.length === 0 ? <Muted>none listed</Muted> : (
                      <ChipList items={j.requiredCertifications} />
                    )}
                  </Cell>
                ))}
              </Row>

              <Row label="Min experience" Icon={Clock}>
                {jobs.map((j) => (
                  <Cell key={j.id}>
                    {j.minYearsExperience != null ? `${j.minYearsExperience} years` : <Muted>none stated</Muted>}
                  </Cell>
                ))}
              </Row>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── pieces ─────────

type LucideIcon = typeof Briefcase;
function Row({
  label, Icon, accent, children,
}: { label: string; Icon?: LucideIcon; accent?: boolean; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label && <span>{label}</span>}
      </div>
      {children}
    </>
  );
}

function Cell({ accent, children }: { accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={'pt-4 text-sm ' + (accent ? 'font-semibold text-teal-700' : 'text-navy-900')}>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-slate-500">{children}</span>;
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((c) => (
        <span key={c} className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
          {c.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}
