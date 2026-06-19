'use client';

import { Search, Plus } from 'lucide-react';
import Link from 'next/link';

export type CaseloadSort = 'recent' | 'overdue' | 'progress';
export type CaseloadFilter = 'all' | 'attention' | 'active' | 'incarcerated';

export const SORT_LABELS: Record<CaseloadSort, string> = {
  recent: 'Recently active',
  overdue: 'Overdue first',
  progress: 'Lowest progress',
};
export const FILTER_LABELS: Record<CaseloadFilter, string> = {
  all: 'Everyone',
  attention: 'Needs attention',
  active: 'In the community',
  incarcerated: 'Pre-release',
};

export function CaseloadToolbar({
  query, onQuery, sort, onSort, filter, onFilter,
}: {
  query: string; onQuery: (v: string) => void;
  sort: CaseloadSort; onSort: (v: CaseloadSort) => void;
  filter: CaseloadFilter; onFilter: (v: CaseloadFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search by name, goal, or conviction…"
          className="block w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(FILTER_LABELS) as CaseloadFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => onFilter(f)}
            className={
              'rounded-full border px-3 py-1 text-xs font-semibold transition ' +
              (filter === f
                ? 'border-teal-600 bg-teal-50 text-teal-700'
                : 'border-slate-300 bg-white text-slate-600 hover:border-teal-400')
            }
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as CaseloadSort)}
        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        {(Object.keys(SORT_LABELS) as CaseloadSort[]).map((s) => (
          <option key={s} value={s}>Sort: {SORT_LABELS[s]}</option>
        ))}
      </select>

      <Link
        href="/caseworker/new"
        className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
      >
        <Plus className="h-3.5 w-3.5" /> New participant
      </Link>
    </div>
  );
}
