'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { JobDto } from '@dxp/shared';
import { getJobsByIds } from '../lib/api';
import { SourceBadge } from './SourceBadge';
import { RiskBadge } from './RiskBadge';
import { prettyDate, prettyIndustry, prettySalary } from '../lib/format';
import { Skeleton } from './Skeleton';

/**
 * Compact "mini list" of jobs driven by a list of ids. Used by the Saved,
 * Recently-Viewed and Applications sections on the dashboard. The caller
 * provides the ids and an extra slot rendered on the right of each row —
 * for an Applications row that's the status pill, for Saved it's the
 * bookmark toggle, etc.
 */
export function MiniJobList({
  ids,
  emptyMessage,
  rightSlot,
  limit = 6,
}: {
  ids: string[];
  emptyMessage: string;
  rightSlot?: (job: JobDto) => React.ReactNode;
  limit?: number;
}) {
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Only fetch the first `limit` ids — the dashboard is a summary, not a
  // full browse. If the user wants everything, we can link through to a
  // dedicated page later.
  const key = ids.slice(0, limit).join(',');

  useEffect(() => {
    if (!key) { setJobs([]); return; }
    setLoading(true);
    getJobsByIds(key.split(','))
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [key]);

  if (ids.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  if (loading && jobs.length === 0) {
    return (
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        {Array.from({ length: Math.min(3, ids.length) }).map((_, i) => (
          <li key={i} className="flex items-start gap-4 p-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      {jobs.map((job) => {
        const location = [job.locationCity, job.locationRegion].filter(Boolean).join(', ');
        const salary = prettySalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
        return (
          <li key={job.id} className="group transition hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3 p-4">
              <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-semibold text-navy-900 group-hover:text-teal-700">{job.title}</h4>
                  <SourceBadge code={job.sourceCode} />
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-600">
                  {job.company}{location && <> · {location}</>} · <span className="capitalize">{prettyIndustry(job.industry)}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                  {job.postedAt && <span>{prettyDate(job.postedAt)}</span>}
                  {salary && <span className="font-medium text-teal-700">{salary}</span>}
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {rightSlot ? rightSlot(job) : (
                  <RiskBadge tier={job.riskTier} backgroundCheckLikely={job.backgroundCheckLikely} />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
