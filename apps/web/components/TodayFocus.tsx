'use client';

import Link from 'next/link';
import {
  CalendarClock, ShieldAlert, Wallet, ListChecks, HeartPulse, Check, ArrowRight, Compass,
} from 'lucide-react';
import { useConditions, updateCondition } from '../lib/checklist-store';
import { advanceCondition } from '../lib/supervision';
import type { FocusEntry, FocusKind, FocusTone } from '../lib/focus';
import { CalendarExportButton } from './CalendarExportButton';

/**
 * "Coming up" — the few things behind the next step in the unified focus
 * queue (lib/focus.ts). Deliberately short: the full list lives in My plan.
 */

const KIND_ICON: Record<FocusKind, typeof CalendarClock> = {
  report: CalendarClock,
  condition: ShieldAlert,
  fee: Wallet,
  plan: ListChecks,
  compass: Compass,
  nudge: ListChecks,
  checkin: HeartPulse,
};

const TONE_ICON: Record<FocusTone, string> = {
  overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  soon: 'bg-amber-50 text-amber-700 ring-amber-200',
  go: 'bg-teal-50 text-teal-700 ring-teal-200',
};
const TONE_LABEL: Record<FocusTone, string> = { overdue: 'Overdue', soon: 'This week', go: '' };

export function TodayFocus({ entries }: { entries: FocusEntry[] }) {
  const conditions = useConditions();

  const markMet = (conditionId: string) => {
    const c = conditions.find((x) => x.id === conditionId);
    if (c) updateCondition(c.id, advanceCondition(c));
  };

  if (entries.length === 0) return null;
  // Counts describe this list only — the item in the big card above is not repeated here.
  const overdueCount = entries.filter((f) => f.tone === 'overdue').length;
  const soonCount = entries.filter((f) => f.tone === 'soon').length;

  return (
    <section aria-labelledby="coming-up-title" className="overflow-hidden rounded-[20px] border border-slate-900/[0.08] bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <div>
          <h2 id="coming-up-title" className="flex flex-wrap items-center gap-2 text-base font-semibold text-navy-900">
            Coming up
            {overdueCount > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">{overdueCount} overdue</span>}
            {soonCount > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">{soonCount} this week</span>}
          </h2>
          <p className="text-sm text-slate-500">After your next step, these are next in line.</p>
        </div>
        <CalendarExportButton />
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {entries.map((f) => {
          const Icon = KIND_ICON[f.kind];
          return (
            <li key={f.id} className="flex items-center gap-3.5 px-5 py-3.5 sm:px-6">
              <span className={'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ' + TONE_ICON[f.tone]}><Icon className="h-4 w-4" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-900">
                  {f.title}
                  {TONE_LABEL[f.tone] && <span className={'ml-2 align-middle text-[10px] font-bold uppercase tracking-wider ' + (f.tone === 'overdue' ? 'text-rose-600' : 'text-amber-600')}>{TONE_LABEL[f.tone]}</span>}
                </p>
                {f.sub && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{f.sub}</p>}
              </div>
              {f.conditionId ? (
                <button type="button" onClick={() => markMet(f.conditionId!)} aria-label={`Mark ${f.title} done`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Done
                </button>
              ) : f.href ? (
                <Link href={f.href} aria-label={`Open: ${f.title}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-teal-400 hover:text-teal-700">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Link href="/plan" className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3.5 text-sm font-semibold text-teal-700 transition hover:bg-slate-50 sm:px-6">
        See everything in My plan <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
