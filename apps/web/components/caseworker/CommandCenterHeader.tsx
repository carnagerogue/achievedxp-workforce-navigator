'use client';

import { Users, AlertTriangle, Gauge, Flame } from 'lucide-react';
import type { Participant } from '../../lib/caseworker-store';
import { progressPct, overdueTasks, needsAttention } from '../../lib/caseworker-progress';

/** KPI strip across the top of the command center. */
export function CommandCenterHeader({ caseload }: { caseload: Participant[] }) {
  const total = caseload.length;
  const withOverdue = caseload.filter((p) => overdueTasks(p).length > 0).length;
  const attention = caseload.filter((p) => needsAttention(p)).length;
  const avgProgress = total
    ? Math.round(caseload.reduce((s, p) => s + progressPct(p), 0) / total)
    : 0;

  const tiles = [
    { Icon: Users, label: 'On caseload', value: String(total), tone: 'text-teal-600' },
    { Icon: Flame, label: 'Need attention', value: String(attention), tone: attention ? 'text-amber-600' : 'text-slate-400' },
    { Icon: AlertTriangle, label: 'Have overdue items', value: String(withOverdue), tone: withOverdue ? 'text-rose-600' : 'text-slate-400' },
    { Icon: Gauge, label: 'Avg. plan progress', value: `${avgProgress}%`, tone: 'text-navy-700' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <t.Icon className={`h-5 w-5 ${t.tone}`} />
          <p className="mt-2 text-2xl font-bold leading-none text-navy-900">{t.value}</p>
          <p className="mt-1 text-xs text-slate-500">{t.label}</p>
        </div>
      ))}
    </div>
  );
}
