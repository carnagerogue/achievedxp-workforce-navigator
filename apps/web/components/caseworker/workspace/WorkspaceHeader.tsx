'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Sparkles, AlertTriangle } from 'lucide-react';
import { ScoreRing } from '../../ScoreRing';
import type { NextBestAction } from '../../../lib/caseworker-nba';

export function WorkspaceHeader({
  name, convictionLabel, contextLabel, pct, nba, onPrint, onJump,
}: {
  name: string;
  convictionLabel: string;
  contextLabel: string;
  pct: number;
  nba: NextBestAction;
  onPrint: () => void;
  onJump: (anchor: string) => void;
}) {
  const urgent = nba.severity === 'urgent';
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/caseworker" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-teal-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Command center
        </Link>
        <button
          onClick={onPrint}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
        >
          <Printer className="h-3.5 w-3.5" /> Save &amp; print plan
        </button>
      </div>

      <div className="mt-4 flex items-start gap-4">
        <ScoreRing score={pct} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-navy-900">{name || 'New participant'}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{convictionLabel} · {contextLabel}</p>
        </div>
      </div>

      {/* Next best action */}
      <button
        onClick={() => nba.anchor && onJump(nba.anchor)}
        className={
          'mt-4 flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ' +
          (urgent
            ? 'border-rose-200 bg-rose-50/60 hover:border-rose-300'
            : 'border-teal-200 bg-teal-50/50 hover:border-teal-300')
        }
      >
        <span className={'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ' + (urgent ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-700')}>
          {urgent ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Next best action</p>
          <p className="text-sm font-bold text-navy-900">{nba.label}</p>
          <p className="text-xs text-slate-600">{nba.reason}</p>
        </div>
      </button>
    </section>
  );
}
