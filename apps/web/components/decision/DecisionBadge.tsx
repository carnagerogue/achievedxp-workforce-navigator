'use client';

import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { DecisionBand } from '@dxp/shared';

const META: Record<DecisionBand, { cls: string; Icon: typeof CheckCircle2 }> = {
  good_next_step: { cls: 'bg-teal-50 text-teal-700 ring-teal-200', Icon: CheckCircle2 },
  worth_checking: { cls: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: AlertTriangle },
  likely_barrier: { cls: 'bg-rose-50 text-rose-700 ring-rose-200', Icon: ShieldAlert },
};

export function DecisionBadge({ band, label }: { band: DecisionBand; label: string }) {
  const m = META[band];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${m.cls}`}>
      <m.Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}
