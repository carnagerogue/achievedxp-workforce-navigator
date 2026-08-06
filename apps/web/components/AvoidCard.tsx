import type { AvoidJobDto } from '@dxp/shared';
import { prettyIndustry } from '../lib/format';

/**
 * Avoid cards look deliberately different from regular JobCards — rose-tinted
 * with the reason up front. Intent: help the candidate understand *why* a
 * role doesn't fit, not just hide it. This is the difference between a
 * filter and a black box.
 */
export function AvoidCard({ item }: { item: AvoidJobDto }) {
  const { job, reasons } = item;
  const location = [job.locationCity, job.locationRegion].filter(Boolean).join(', ') || 'Location TBD';

  return (
    <article className="relative rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/70 to-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-navy-900">{job.title}</h3>
          <p className="mt-0.5 truncate text-sm text-slate-600">
            <span className="font-medium text-slate-800">{job.company}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            {location}
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="capitalize">{prettyIndustry(job.industry)}</span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          Skip
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-rose-200/80 bg-white/80 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
          Why we&apos;re flagging it
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
          {reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </article>
  );
}
