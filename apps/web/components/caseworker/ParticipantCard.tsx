'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, TrendingUp, Minus, TrendingDown, MapPin, Target } from 'lucide-react';
import { CONVICTION_LABELS } from '@dxp/shared';
import type { Participant } from '../../lib/caseworker-store';
import { ScoreRing } from '../ScoreRing';
import {
  progressPct, overdueTasks, nextDueTask, momentum, openTasks, type Momentum,
} from '../../lib/caseworker-progress';

const MOMENTUM_META: Record<Momentum, { label: string; cls: string; Icon: typeof TrendingUp }> = {
  rising: { label: 'Rising', cls: 'bg-teal-50 text-teal-700 ring-teal-200', Icon: TrendingUp },
  steady: { label: 'Steady', cls: 'bg-slate-50 text-slate-600 ring-slate-200', Icon: Minus },
  stalled: { label: 'Stalled', cls: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: TrendingDown },
};

export function ParticipantCard({ p }: { p: Participant }) {
  const pct = progressPct(p);
  const overdue = overdueTasks(p);
  const next = nextDueTask(p);
  const mo = MOMENTUM_META[momentum(p)];
  const open = openTasks(p).length;

  return (
    <Link
      href={`/caseworker/${p.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-teal-400 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <ScoreRing score={pct} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-navy-900">{p.name || 'Unnamed participant'}</p>
            {overdue.length > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                <AlertTriangle className="h-3 w-3" /> {overdue.length} overdue
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{CONVICTION_LABELS[p.conviction]}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${mo.cls}`}>
              <mo.Icon className="h-3 w-3" /> {mo.label}
            </span>
            <span className="text-[11px] text-slate-400">{pct}% · {open} open</span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-[11px] text-slate-500">
        {p.careerGoal && (
          <p className="inline-flex items-center gap-1 truncate"><Target className="h-3 w-3 shrink-0" /> {p.careerGoal}</p>
        )}
        {p.location && (
          <p className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> {p.location}</p>
        )}
        {next ? (
          <p className="truncate text-slate-600">Next: {next.title}{next.dueDate ? ` · ${next.dueDate}` : ''}</p>
        ) : (
          <p className="text-slate-400">No plan items yet</p>
        )}
      </div>

      <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 opacity-0 transition group-hover:opacity-100">
        Open workspace <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}
