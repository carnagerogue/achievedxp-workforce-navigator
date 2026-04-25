'use client';

import Link from 'next/link';
import { GitCompare, X } from 'lucide-react';
import { useCompareIds, clearCompare } from '../lib/personal-store';

/**
 * Floating pill fixed to the bottom-right of the viewport. Appears as soon
 * as a job is added to the compare set and disappears when the set is
 * empty. Gives users a persistent way to jump to the /jobs/compare view
 * without hunting for a button.
 */
export function CompareBar() {
  const ids = useCompareIds();
  if (ids.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 animate-slide-up">
      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 shadow-card-hover backdrop-blur">
        <GitCompare className="h-4 w-4 text-sunset-600" />
        <span className="text-sm font-semibold text-navy-900">
          {ids.length} {ids.length === 1 ? 'job' : 'jobs'} in compare
        </span>
        <Link
          href="/jobs/compare"
          className="rounded-full bg-sunset-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sunset-600"
        >
          Open compare →
        </Link>
        <button
          type="button"
          onClick={clearCompare}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Clear compare set"
          title="Clear compare"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
