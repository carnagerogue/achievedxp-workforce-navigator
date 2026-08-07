'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Link as LinkIcon,
  Wallet,
  Wrench,
  GraduationCap,
  Award,
} from 'lucide-react';
import { decisionFor, type JobDto } from '@dxp/shared';
import { getJob, getSimilarJobs } from '../../../lib/api';
import { FitAndNextSteps } from '../../../components/decision/FitAndNextSteps';
import { DecisionBadge } from '../../../components/decision/DecisionBadge';
import { scoreJobUnified } from '../../../lib/job-scoring';
import { getLocalProfile } from '../../../lib/local-profile';
import { candidateProfilesFromStored, convictionTypesFor } from '../../../lib/profile-store';
import { RiskBadge } from '../../../components/RiskBadge';
import { SourceBadge } from '../../../components/SourceBadge';
import { Skeleton } from '../../../components/Skeleton';
import { useToast } from '../../../components/Toast';
import { SaveJobButton } from '../../../components/SaveJobButton';
import { CompareButton } from '../../../components/CompareButton';
import { ApplicationStatusPicker } from '../../../components/ApplicationStatusPicker';
import { ApplyButton } from '../../../components/apply/ApplyButton';
import { useTrackRecentView } from '../../../lib/personal-store';
import { prettyDate, prettyIndustry, prettySalary } from '../../../lib/format';
import { parseDescription } from '../../../lib/description-format';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [job, setJob] = useState<JobDto | null>(null);
  const [similar, setSimilar] = useState<JobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => { setProfileLoaded(true); }, []);

  // Compatibility for this job against the user's saved profile (same shared
  // scorer as the dashboard and Browse). Null when there's no profile yet.
  const match = useMemo(() => {
    if (!job || !profileLoaded) return null;
    const p = getLocalProfile();
    if (!p) return null;
    return scoreJobUnified({
      candidates: candidateProfilesFromStored(p),
      convictionTypes: convictionTypesFor(p),
      profile: p,
      hasConvictions: (p.convictions?.length ?? 0) > 0,
    }, job);
  }, [job, profileLoaded]);

  const searchParams = useSearchParams();
  const fromCaseworker = searchParams.get('from') === 'caseworker';

  // Decision support — band + "fit and next steps" sourced from classification
  // evidence (item 2). Leads instead of a bare score.
  const decision = useMemo(() => {
    if (!job) return null;
    const p = profileLoaded ? getLocalProfile() : null;
    const convictionSelected = (p?.convictions?.length ?? 0) > 0;
    return decisionFor(job, {
      hardBlocked: !!match?.hardBlockReason,
      hardBlockReason: match?.hardBlockReason ?? null,
      convictionSelected,
    });
  }, [job, match, profileLoaded]);

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    Promise.all([getJob(params.id), getSimilarJobs(params.id, 4).catch(() => [])])
      .then(([j, s]) => { setJob(j); setSimilar(s); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params?.id]);

  // Track recent view — drives the "Recently viewed" dashboard section.
  useTrackRecentView(job?.id);

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    // Prefer the native share sheet (mobile + modern desktop) — falls back
    // to clipboard so the flow always succeeds.
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: job?.title ?? 'Job',
          text: job ? `${job.title} at ${job.company}` : undefined,
          url,
        });
        return;
      } catch {
        // user canceled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', 'Share it with anyone — no sign-in required to view.');
    } catch {
      toast.error('Could not copy link', 'Try selecting the URL manually.');
    }
  };

  if (loading) return <DetailSkeleton />;
  if (error)   return <ErrorBox message={error} />;
  if (!job) {
    return (
      <div className="mx-auto max-w-xl animate-fade-in rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-card">
        <h1 className="text-xl font-semibold text-navy-900">This job isn’t available</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">It may have been filled or taken down. Plenty of others are waiting for you.</p>
        <Link href="/jobs" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700">
          ← Back to jobs
        </Link>
      </div>
    );
  }

  const location = [job.locationCity, job.locationRegion, job.locationPostalCode]
    .filter(Boolean)
    .join(', ') || 'Location TBD';
  const salary = prettySalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const sections = parseDescription(job.description);

  return (
    <article className="mx-auto max-w-3xl animate-fade-in">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/jobs" className="inline-flex items-center gap-1 font-medium text-teal-700 transition hover:text-teal-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Jobs
        </Link>
        <span className="text-slate-300">/</span>
        <span className="truncate text-slate-600">{job.title}</span>
      </nav>

      {/* ─────────── Header card ─────────── */}
      <header className="relative mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {decision && <DecisionBadge band={decision.band} label={decision.label} />}
          <SourceBadge code={job.sourceCode} />
          <RiskBadge tier={job.riskTier} backgroundCheckLikely={job.backgroundCheckLikely} />
          {job.remote && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sunset-200 bg-sunset-50 px-2.5 py-0.5 text-xs font-medium text-sunset-700">
              Remote
            </span>
          )}
          {job.excludesFelons && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
              Employer requires a clean record
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold leading-tight tracking-tight text-navy-900 sm:text-4xl">
          {job.title}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-navy-800">{job.company}</span>
          </span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-400" /> {location}
          </span>
        </p>

        <dl className="mt-6 grid gap-x-6 gap-y-3 border-t border-slate-200 pt-5 text-sm sm:grid-cols-2">
          <MetaField Icon={Calendar} label="Posted" value={job.postedAt ? new Date(job.postedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
          <MetaField Icon={Briefcase} label="Employment type" value={job.employmentType.replace('_', ' ').toLowerCase()} />
          {job.industry && <MetaField Icon={Building2} label="Industry" value={prettyIndustry(job.industry)} />}
          {salary && <MetaField Icon={Wallet} label="Salary" value={salary} accent />}
        </dl>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <ApplyButton job={job} />
          <SaveJobButton jobId={job.id} variant="full" />
          <ApplicationStatusPicker jobId={job.id} />
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-700"
            title={job.applyUrl}
          >
            <LinkIcon className="h-3 w-3" />
            {shortenUrl(job.applyUrl)}
          </a>
        </div>
      </header>

      {/* ─────────── Fit & next steps (decision support) ─────────── */}
      {decision && (
        <div className="mt-6">
          <FitAndNextSteps decision={decision} defaultEvidenceOpen={fromCaseworker} />
        </div>
      )}

      {/* ─────────── Qualifications ─────────── */}
      {(job.requiredSkills.length > 0 || job.requiredCertifications.length > 0 || job.minYearsExperience) && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
            <Award className="h-5 w-5 text-teal-600" /> Qualifications
          </h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            {job.minYearsExperience != null && (
              <QualBlock
                Icon={Clock}
                label="Min experience"
                value={`${job.minYearsExperience} year${job.minYearsExperience === 1 ? '' : 's'}`}
              />
            )}
            {job.requiredSkills.length > 0 && (
              <QualBlock Icon={Wrench} label="Skills" chips={job.requiredSkills} />
            )}
            {job.requiredCertifications.length > 0 && (
              <QualBlock Icon={GraduationCap} label="Certifications" chips={job.requiredCertifications} />
            )}
          </div>
        </section>
      )}

      {/* ─────────── Description ─────────── */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold text-navy-900">Description</h2>
        {job.descriptionHtml ? (
          <div
            className="dxp-description mt-4 text-sm leading-relaxed text-slate-700"
            dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
          />
        ) : sections.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No description provided by the source.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {sections.map((sec, si) => (
              <div key={si}>
                {sec.heading && (
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-800">
                    {sec.heading}
                  </h3>
                )}
                {sec.blocks.map((block, bi) =>
                  block.type === 'paragraph' ? (
                    <p key={bi} className="mb-3 text-sm leading-relaxed text-slate-700">{block.text}</p>
                  ) : (
                    <ul key={bi} className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                      {block.items.map((it, ii) => <li key={ii}>{it}</li>)}
                    </ul>
                  ),
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─────────── Similar jobs ─────────── */}
      {similar.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
            <Briefcase className="h-5 w-5 text-teal-600" /> Similar jobs
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Same industry, similar risk profile. Based on our classifier, not a black-box recommendation.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {similar.map((s) => <SimilarJobCard key={s.id} job={s} />)}
          </ul>
        </section>
      )}

      {/* Sticky mobile apply */}
      <div className="sticky bottom-4 z-10 mt-8 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-card-hover backdrop-blur sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">Ready to apply?</p>
            <p className="truncate text-sm font-semibold text-navy-900">{job.title}</p>
          </div>
          <ApplyButton job={job} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 active:scale-[0.98]" />
        </div>
      </div>
    </article>
  );
}

// ───────── pieces ─────────

type LucideIcon = typeof Calendar;

function MetaField({
  Icon, label, value, accent,
}: { Icon: LucideIcon; label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</dt>
        <dd className={'mt-0.5 ' + (accent ? 'font-semibold text-teal-700' : 'text-navy-900')}>{value}</dd>
      </div>
    </div>
  );
}

function QualBlock({
  Icon, label, value, chips,
}: { Icon: LucideIcon; label: string; value?: string; chips?: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      {value && <p className="mt-1 text-sm font-semibold text-navy-900">{value}</p>}
      {chips && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800"
            >
              {c.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SimilarJobCard({ job }: { job: JobDto }) {
  const location = [job.locationCity, job.locationRegion].filter(Boolean).join(', ');
  const salary = prettySalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  return (
    <li>
      <Link
        href={`/jobs/${job.id}`}
        className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-card-hover"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-navy-900 group-hover:text-teal-700">{job.title}</h3>
              <SourceBadge code={job.sourceCode} />
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-600">
              {job.company}{location && <> · {location}</>}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
              {job.postedAt && <span>{prettyDate(job.postedAt)}</span>}
              {salary && <span className="font-medium text-teal-700">{salary}</span>}
            </div>
          </div>
          <RiskBadge tier={job.riskTier} backgroundCheckLikely={job.backgroundCheckLikely} />
        </div>
      </Link>
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <Skeleton className="h-3 w-24" />
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-card sm:p-10">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="mt-5 h-10 w-4/5" />
        <Skeleton className="mt-2 h-4 w-3/5" />
        <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="mt-6 h-11 w-48 rounded-xl" />
      </div>
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[96%]" />
          <Skeleton className="h-3 w-[88%]" />
          <Skeleton className="h-3 w-[92%]" />
          <Skeleton className="h-3 w-[70%]" />
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-card">
      <h2 className="text-lg font-semibold text-rose-900">Couldn&apos;t load this job</h2>
      <p className="mt-1 text-sm text-rose-800">{message}</p>
      <Link
        href="/jobs"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>
    </div>
  );
}

function shortenUrl(u: string): string {
  try { return new URL(u).hostname; } catch { return u.slice(0, 60); }
}
