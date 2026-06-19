'use client';

import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, TrendingUp, Minus, TrendingDown, MapPin, Target, ShieldCheck,
} from 'lucide-react';
import { CONVICTION_LABELS, USER_CONTEXT_OPTIONS } from '@dxp/shared';
import type { Participant } from '../../lib/caseworker-store';
import { Avatar } from './Avatar';
import { ProgressRing } from './ProgressRing';
import {
  progressPct, overdueTasks, nextDueTask, momentum, openTasks, type Momentum,
} from '../../lib/caseworker-progress';

const MOMENTUM_META: Record<Momentum, { label: string; cls: string; Icon: typeof TrendingUp }> = {
  rising: { label: 'Rising', cls: 'bg-teal-50 text-teal-700 ring-teal-200', Icon: TrendingUp },
  steady: { label: 'Steady', cls: 'bg-slate-50 text-slate-600 ring-slate-200', Icon: Minus },
  stalled: { label: 'Stalled', cls: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: TrendingDown },
};

const contextLabel = (m: string) => USER_CONTEXT_OPTIONS.find((o) => o.value === m)?.label ?? m;

export function ParticipantCard({ p }: { p: Participant }) {
  const pct = progressPct(p);
  const overdue = overdueTasks(p);
  const next = nextDueTask(p);
  const mo = MOMENTUM_META[momentum(p)];
  const open = openTasks(p).length;
  const total = (p.tasks ?? []).length;

  return (
    <Link
      href={`/caseworker/${p.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-lg"
    >
      {/* accent edge on hover */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-teal-500 to-cyan-500 transition-transform duration-300 group-hover:scale-x-100" />

      <div className="flex items-start gap-3">
        <Avatar name={p.name || '?'} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-navy-900">{p.name || 'Unnamed participant'}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{CONVICTION_LABELS[p.conviction]}</p>
        </div>
        <ProgressRing pct={pct} size={46} stroke={4} />
      </div>

      {/* status badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{contextLabel(p.contextMode)}</span>
        {p.supervision !== 'none' && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-navy-700">
            <ShieldCheck className="h-2.5 w-2.5" /> {p.supervision.replace(/_/g, ' ')}
          </span>
        )}
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${mo.cls}`}>
          <mo.Icon className="h-2.5 w-2.5" /> {mo.label}
        </span>
        {overdue.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
            <AlertTriangle className="h-2.5 w-2.5" /> {overdue.length} overdue
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1 text-[11px] text-slate-500">
        {p.careerGoal && <p className="inline-flex items-center gap-1 truncate"><Target className="h-3 w-3 shrink-0 text-slate-400" /> {p.careerGoal}</p>}
        {p.location && <p className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0 text-slate-400" /> {p.location}</p>}
      </div>

      {/* next action */}
      <div className="mt-2.5 rounded-lg bg-slate-50/80 px-2.5 py-1.5">
        {next ? (
          <p className="truncate text-[11px] text-slate-600">
            <span className="font-semibold text-slate-700">Next:</span> {next.title}{next.dueDate ? ` · ${next.dueDate}` : ''}
          </p>
        ) : (
          <p className="text-[11px] font-medium text-amber-700">No plan yet — start the first steps</p>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{total > 0 ? `${pct}% · ${open} open` : 'No tasks'}</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 opacity-0 transition group-hover:opacity-100">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
