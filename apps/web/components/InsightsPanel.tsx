'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, TrendingUp, Sparkles } from 'lucide-react';
import type { InsightsResponseDto } from '@dxp/shared';
import { getInsights } from '../lib/api';
import { Skeleton } from './Skeleton';

/**
 * Data-driven growth recommendations. Every row says "complete X → unlock
 * N new jobs" backed by a real simulation against the live job pool on
 * the server. Replaces the Phase-3 TrainingPlaceholder with actual data.
 */
export function InsightsPanel({ userId }: { userId: string }) {
  const [data, setData] = useState<InsightsResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getInsights(userId)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Couldn&apos;t load insights: {error}
      </p>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        No suggestions yet — your profile already matches well against the current job pool.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 bg-gradient-to-br from-teal-50/70 to-white px-5 py-4">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-700">
          <Sparkles className="h-3.5 w-3.5" /> Data-driven · simulated against {data.currentTop + data.currentMedium}+ live jobs
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Complete one of these to expand your top matches — ranked by how many postings it unlocks.
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {data.items.map((it) => (
          <li key={it.kind + it.code} className="flex items-center gap-4 px-5 py-4">
            <div className={
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' +
              (it.kind === 'certification' ? 'bg-teal-50 text-teal-700' : 'bg-sunset-50 text-sunset-700')
            }>
              {it.kind === 'certification' ? <GraduationCap className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy-900">
                {it.kind === 'certification' ? 'Complete ' : 'Add skill · '}
                <span className="text-teal-700">{it.label}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {it.unlocks + it.promotesToTop > 0 ? (
                  <>
                    <strong className="font-semibold text-navy-900">+{it.unlocks}</strong>{' '}
                    new {it.unlocks === 1 ? 'match' : 'matches'}
                    {it.promotesToTop > 0 && (
                      <>, <strong className="font-semibold text-navy-900">{it.promotesToTop}</strong> promoted to Top</>
                    )}
                    <span className="ml-2 text-slate-400">· {it.demand} postings require it</span>
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-navy-900">{it.demand}</strong>{' '}
                    {it.demand === 1 ? 'posting requires' : 'postings require'} it — a common ask in your target roles
                  </>
                )}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
              {it.unlocks + it.promotesToTop > 0 ? `+${it.unlocks + it.promotesToTop}` : 'In demand'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
