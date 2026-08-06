'use client';

import Link from 'next/link';
import {
  CalendarClock, ShieldAlert, Wallet, ListChecks, HeartPulse, Check,
  ArrowRight, CheckCircle2, Sparkles,
} from 'lucide-react';
import {
  useConditions, useSupervisionInfo, useFees, useChecklist, useCheckins,
  updateCondition,
} from '../lib/checklist-store';
import {
  reportDueState, conditionStatus, feeIsBehind, feeBalance, fmtMoney, fmtDate, advanceCondition,
  type SupervisionCondition,
} from '../lib/supervision';

/**
 * "Staying on track" — the one surface that makes the time-sensitive things
 * impossible to miss. A missed check-in or unpaid fee is the most common
 * technical-violation trigger that sends someone back; this pulls every
 * deadline the app already knows about into a single, prioritized, one-tap
 * list so the person can act before anything lapses. Pure read of the
 * browser-local stores — works whether or not a job profile exists.
 */

type Tone = 'overdue' | 'soon' | 'go';
interface FocusItem {
  id: string;
  tone: Tone;
  Icon: typeof CalendarClock;
  text: string;
  sub?: string;
  href?: string;
  onAct?: () => void;
  actLabel?: string;
}

const DAY = 24 * 60 * 60 * 1000;
function dueEpoch(d?: string): number {
  if (!d) return NaN;
  const [y, m, dd] = d.split('-').map(Number);
  return y && m && dd ? new Date(y, m - 1, dd).getTime() : NaN;
}
function daysAway(d?: string): number {
  const e = dueEpoch(d);
  if (Number.isNaN(e)) return NaN;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((e - today.getTime()) / DAY);
}

const TONE_CARD: Record<Tone, string> = {
  overdue: 'border-rose-200 bg-rose-50/70',
  soon: 'border-amber-200 bg-amber-50/60',
  go: 'border-teal-200 bg-teal-50/50',
};
const TONE_ICON: Record<Tone, string> = {
  overdue: 'bg-rose-100 text-rose-700',
  soon: 'bg-amber-100 text-amber-700',
  go: 'bg-teal-100 text-teal-700',
};

export function TodayFocus() {
  const conditions = useConditions();
  const supervision = useSupervisionInfo();
  const fees = useFees();
  const items = useChecklist();
  const checkins = useCheckins();

  const focus: FocusItem[] = [];
  const markMet = (c: SupervisionCondition) => updateCondition(c.id, advanceCondition(c));

  // ── Supervision report deadline ──
  const rds = reportDueState(supervision.nextReportDate);
  if (rds === 'overdue') {
    focus.push({ id: 'report', tone: 'overdue', Icon: CalendarClock, href: '/local-help?tab=checklist',
      text: 'Report to your officer is overdue', sub: `Was due ${fmtDate(supervision.nextReportDate)} — contact them today.` });
  } else if (rds === 'due_soon') {
    focus.push({ id: 'report', tone: 'soon', Icon: CalendarClock, href: '/local-help?tab=checklist',
      text: `Report to your officer by ${fmtDate(supervision.nextReportDate)}`, sub: 'Don’t miss it — a missed report is a violation.' });
  }

  // ── Conditions (check-ins, tests, programs…) ──
  for (const c of conditions) {
    const s = conditionStatus(c);
    if (s === 'overdue') {
      focus.push({ id: `cond-${c.id}`, tone: 'overdue', Icon: ShieldAlert,
        text: `Overdue: ${c.label}`, sub: c.dueDate ? `Was due ${fmtDate(c.dueDate)}` : undefined,
        onAct: () => markMet(c), actLabel: 'Mark met' });
    } else if (s === 'due_soon') {
      focus.push({ id: `cond-${c.id}`, tone: 'soon', Icon: ShieldAlert,
        text: `Due soon: ${c.label}`, sub: c.dueDate ? `By ${fmtDate(c.dueDate)}` : undefined,
        onAct: () => markMet(c), actLabel: 'Mark met' });
    }
  }

  // ── Fees behind ──
  for (const o of fees) {
    if (feeIsBehind(o)) {
      focus.push({ id: `fee-${o.id}`, tone: 'overdue', Icon: Wallet, href: '/local-help?tab=checklist',
        text: `Payment behind: ${o.label}`, sub: `${fmtMoney(feeBalance(o))} owed${o.dueDate ? ` · was due ${fmtDate(o.dueDate)}` : ''}` });
    }
  }

  // ── Plan steps with target dates ──
  for (const it of items) {
    if (it.status === 'completed' || !it.targetDate) continue;
    const d = daysAway(it.targetDate);
    if (Number.isNaN(d)) continue;
    if (d < 0) {
      focus.push({ id: `step-${it.id}`, tone: 'overdue', Icon: ListChecks, href: '/local-help?tab=checklist',
        text: `Overdue step: ${it.name}`, sub: `Was set for ${fmtDate(it.targetDate)}` });
    } else if (d <= 7) {
      focus.push({ id: `step-${it.id}`, tone: 'soon', Icon: ListChecks, href: '/local-help?tab=checklist',
        text: `This week: ${it.name}`, sub: `By ${fmtDate(it.targetDate)}` });
    }
  }

  // ── Weekly check-in nudge (only if nothing more urgent and it's been a week) ──
  const lastCheckin = checkins[0]?.date;
  const checkinStale = !lastCheckin || daysAway(lastCheckin) <= -7;
  if (checkinStale && focus.filter((f) => f.tone === 'overdue').length === 0) {
    focus.push({ id: 'checkin', tone: 'go', Icon: HeartPulse, href: '/local-help?tab=checklist',
      text: 'Log this week’s check-in', sub: 'A quick note keeps your momentum — and shows effort over time.' });
  }

  // Order: overdue first, then this-week, then keep-moving. Cap to keep it focused.
  const rank: Record<Tone, number> = { overdue: 0, soon: 1, go: 2 };
  focus.sort((a, b) => rank[a.tone] - rank[b.tone]);
  const shown = focus.slice(0, 6);
  const overdueCount = focus.filter((f) => f.tone === 'overdue').length;
  const soonCount = focus.filter((f) => f.tone === 'soon').length;

  // Nothing urgent → a calm, encouraging on-track state that reflects real wins.
  if (shown.length === 0) {
    const stepsDone = items.filter((i) => i.status === 'completed').length;
    const wins: string[] = [];
    if (stepsDone > 0) wins.push(`${stepsDone} step${stepsDone === 1 ? '' : 's'} done`);
    if (checkins.length > 0) wins.push(`${checkins.length} check-in${checkins.length === 1 ? '' : 's'} logged`);
    return (
      <section className="mb-6 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700"><CheckCircle2 className="h-5 w-5" /></span>
          <div>
            <h2 className="text-sm font-bold text-navy-900">You’re on track{wins.length ? ` — ${wins.join(' · ')}` : ''}</h2>
            <p className="text-xs text-slate-600">No deadlines need you right now. Keep building your plan and applying to strong matches below.</p>
          </div>
        </div>
      </section>
    );
  }

  const headline = overdueCount > 0
    ? `${overdueCount} thing${overdueCount === 1 ? '' : 's'} need you now`
    : `${soonCount} thing${soonCount === 1 ? '' : 's'} coming up this week`;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <Sparkles className="h-4 w-4 text-teal-600" /> Staying on track
        </h2>
        <span className={'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ' + (overdueCount > 0 ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-700 ring-amber-200')}>
          {headline}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {shown.map((f) => (
          <li key={f.id} className={'flex items-center gap-3 px-5 py-3 ' + TONE_CARD[f.tone]}>
            <span className={'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + TONE_ICON[f.tone]}><f.Icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy-900">{f.text}</p>
              {f.sub && <p className="text-[11px] text-slate-600">{f.sub}</p>}
            </div>
            {f.onAct && f.actLabel && (
              <button onClick={f.onAct} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-700">
                <Check className="h-3 w-3" /> {f.actLabel}
              </button>
            )}
            {f.href && !f.onAct && (
              <Link href={f.href} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700">
                Open <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
