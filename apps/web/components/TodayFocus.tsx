'use client';

import Link from 'next/link';
import {
  CalendarClock, ShieldAlert, Wallet, ListChecks, HeartPulse, Check,
  ArrowRight, CheckCircle2, Sparkles, Compass,
} from 'lucide-react';
import { useConditions, updateCondition, useChecklist, useCheckins } from '../lib/checklist-store';
import { advanceCondition } from '../lib/supervision';
import type { FocusEntry, FocusKind, FocusTone } from '../lib/focus';
import { CalendarExportButton } from './CalendarExportButton';

/**
 * "Staying on track" — renders the unified focus queue (lib/focus.ts) minus
 * whatever the hero already shows. One prioritized, one-tap list of every
 * deadline the app knows about, so nothing time-critical can hide.
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

const TONE_CARD: Record<FocusTone, string> = {
  overdue: 'border-rose-200 bg-rose-50/70',
  soon: 'border-amber-200 bg-amber-50/60',
  go: 'border-teal-200 bg-teal-50/50',
};
const TONE_ICON: Record<FocusTone, string> = {
  overdue: 'bg-rose-100 text-rose-700',
  soon: 'bg-amber-100 text-amber-700',
  go: 'bg-teal-100 text-teal-700',
};

export function TodayFocus({ entries, totals }: { entries: FocusEntry[]; totals?: { overdue: number; soon: number } }) {
  const conditions = useConditions();
  const items = useChecklist();
  const checkins = useCheckins();

  const markMet = (conditionId: string) => {
    const c = conditions.find((x) => x.id === conditionId);
    if (c) updateCondition(c.id, advanceCondition(c));
  };

  const shown = entries.slice(0, 6);
  // The chip reflects the WHOLE queue (hero included) when totals are passed,
  // so it never disagrees with the hero's attention chip above it.
  const overdueCount = totals?.overdue ?? entries.filter((f) => f.tone === 'overdue').length;
  const soonCount = totals?.soon ?? entries.filter((f) => f.tone === 'soon').length;

  // Nothing urgent → a calm, encouraging on-track state that reflects real wins.
  if (shown.length === 0) {
    const stepsDone = items.filter((i) => i.status === 'completed').length;
    const wins: string[] = [];
    if (stepsDone > 0) wins.push(`${stepsDone} step${stepsDone === 1 ? '' : 's'} done`);
    if (checkins.length > 0) wins.push(`${checkins.length} check-in${checkins.length === 1 ? '' : 's'} logged`);
    const hasProgress = wins.length > 0;
    return (
      <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700"><CheckCircle2 className="h-5 w-5" /></span>
          <div>
            <h2 className="text-sm font-bold text-navy-900">{hasProgress ? `You’re on track — ${wins.join(' · ')}` : 'Let’s set up your next step'}</h2>
            <p className="text-xs text-slate-600">{hasProgress ? 'No deadlines need you right now. Keep building your plan and applying to strong matches.' : 'Add a plan step or answer a few readiness questions to get a useful daily focus.'}</p>
          </div>
        </div>
      </section>
    );
  }

  const headline = overdueCount > 0
    ? `${overdueCount} thing${overdueCount === 1 ? '' : 's'} need you now`
    : soonCount > 0
    ? `${soonCount} thing${soonCount === 1 ? '' : 's'} coming up this week`
    : 'Keep the momentum going';

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <Sparkles className="h-4 w-4 text-teal-600" /> Staying on track
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <CalendarExportButton />
          <span className={'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ' + (overdueCount > 0 ? 'bg-rose-50 text-rose-700 ring-rose-200' : soonCount > 0 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-teal-50 text-teal-700 ring-teal-200')}>
            {headline}
          </span>
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {shown.map((f) => {
          const Icon = KIND_ICON[f.kind];
          return (
            <li key={f.id} className={'flex items-center gap-3 px-5 py-3 ' + TONE_CARD[f.tone]}>
              <span className={'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + TONE_ICON[f.tone]}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-900">{f.title}</p>
                {f.sub && <p className="text-[11px] text-slate-600">{f.sub}</p>}
              </div>
              {f.conditionId && (
                <button onClick={() => markMet(f.conditionId!)} aria-label={`Mark ${f.title} met`} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-700">
                  <Check className="h-3 w-3" /> Mark met
                </button>
              )}
              {f.href && !f.conditionId && (
                <Link href={f.href} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700">
                  Open <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
