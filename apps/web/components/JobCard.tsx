import Link from 'next/link';
import type { ScoredJobDto } from '@dxp/shared';
import { ScoreRing } from './ScoreRing';
import { RiskBadge } from './RiskBadge';
import { prettyDate, prettyIndustry } from '../lib/format';

type Props = { match: ScoredJobDto };

/**
 * Dashboard job card. Every piece the plan calls for is present: title,
 * company, location, match %, "Why this matches", risk indicator, apply
 * link. The breakdown chips keep the scoring auditable at a glance — no
 * hidden logic means caseworkers can always defend a ranking.
 */
export function JobCard({ match }: Props) {
  const { score, breakdown, explanation, job } = match;
  const location = [job.locationCity, job.locationRegion].filter(Boolean).join(', ') || 'Location TBD';

  return (
    <article className="group relative flex h-full min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-navy-900">
            <Link href={`/jobs/${job.id}`} className="after:absolute after:inset-0 hover:text-teal-700">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-600">
            <span className="font-medium text-slate-800">{job.company}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            {location}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            <span className="capitalize">{prettyIndustry(job.industry)}</span>
            {job.postedAt && <> · posted {prettyDate(job.postedAt)}</>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <ScoreRing score={score} />
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Match</p>
        </div>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        <span className="font-medium text-slate-900">Why this matches:</span>{' '}
        {explanation}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <BreakdownChip label="industry"    value={breakdown.industry}       max={25} />
        <BreakdownChip label="skills"      value={breakdown.skills}         max={25} />
        <BreakdownChip label="certs"       value={breakdown.certifications} max={15} />
        <BreakdownChip label="experience"  value={breakdown.experience}     max={15} />
        <BreakdownChip label="location"    value={breakdown.location}       max={10} />
        <BreakdownChip label="risk"        value={breakdown.risk}           max={10} />
      </div>

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0"><RiskBadge tier={job.riskTier} backgroundCheckLikely={job.backgroundCheckLikely} /></div>
          <div className="relative z-10 flex gap-2">
            <Link
              href={`/jobs/${job.id}`}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Details
            </Link>
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              Apply
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function BreakdownChip({ label, value, max }: { label: string; value: number; max: number }) {
  const ratio = value / max;
  const tone =
    ratio === 1
      ? 'bg-teal-50 text-teal-700 border-teal-200'
      : ratio >= 0.5
      ? 'bg-slate-100 text-slate-700 border-slate-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <span className={`rounded-full border px-2 py-0.5 ${tone}`}>
      {label} {value}/{max}
    </span>
  );
}
