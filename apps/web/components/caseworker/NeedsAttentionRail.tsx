'use client';

import Link from 'next/link';
import { Flame, AlertTriangle, TrendingDown, CircleDashed, ChevronRight, ShieldAlert } from 'lucide-react';
import type { Participant } from '../../lib/caseworker-store';
import { overdueTasks, momentum, dueSoonTasks, overdueConditionCount } from '../../lib/caseworker-progress';

interface Attn { p: Participant; reason: string; Icon: typeof Flame; tone: string; rank: number }

function assess(p: Participant): Attn | null {
  const odCond = overdueConditionCount(p);
  if (odCond > 0) {
    return { p, reason: `${odCond} supervision condition${odCond === 1 ? '' : 's'} overdue — violation risk`, Icon: ShieldAlert, tone: 'text-rose-600', rank: 0 };
  }
  const overdue = overdueTasks(p);
  if (overdue.length > 0) {
    return { p, reason: `${overdue.length} overdue: ${overdue[0].title}`, Icon: AlertTriangle, tone: 'text-rose-600', rank: 1 };
  }
  if (momentum(p) === 'stalled') {
    return { p, reason: 'Stalled — no progress lately', Icon: TrendingDown, tone: 'text-amber-600', rank: 2 };
  }
  if ((p.tasks ?? []).length === 0) {
    return { p, reason: 'No plan yet — build the first steps', Icon: CircleDashed, tone: 'text-slate-500', rank: 3 };
  }
  const soon = dueSoonTasks(p);
  if (soon.length > 0) {
    return { p, reason: `Due soon: ${soon[0].title}`, Icon: Flame, tone: 'text-amber-600', rank: 4 };
  }
  return null;
}

export function NeedsAttentionRail({ caseload }: { caseload: Participant[] }) {
  const items = caseload
    .map(assess)
    .filter((x): x is Attn => x !== null)
    .sort((a, b) => a.rank - b.rank);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
        <Flame className="h-4 w-4 text-amber-600" /> Needs attention today
        <span className="text-sm font-normal text-slate-400">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Everyone&rsquo;s on track. Nothing overdue or stalled. 🎉</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map(({ p, reason, Icon, tone }) => (
            <li key={p.id}>
              <Link
                href={`/caseworker/${p.id}#plan`}
                className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 transition hover:border-teal-400 hover:bg-teal-50/40"
              >
                <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy-900">{p.name || 'Unnamed'}</p>
                  <p className="truncate text-xs text-slate-500">{reason}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
