'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ProgressRing } from '../ProgressRing';
import { Avatar } from '../Avatar';
import type { NextBestAction } from '../../../lib/caseworker-nba';

export interface HeaderStats { open: number; overdue: number; matches: number; barriers: number }

export function WorkspaceHeader({
  name, convictionLabel, contextLabel, supervisionLabel, pct, nba, stats, onPrint, onJump,
}: {
  name: string;
  convictionLabel: string;
  contextLabel: string;
  supervisionLabel?: string;
  pct: number;
  nba: NextBestAction;
  stats: HeaderStats;
  onPrint: () => void;
  onJump: (anchor: string) => void;
}) {
  const urgent = nba.severity === 'urgent';
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
      {/* gradient band */}
      <div className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 px-5 py-5 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_90%_-20%,rgba(45,212,229,0.25),transparent)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <Link href="/caseworker" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-100/90 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Command center
          </Link>
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2 text-xs font-semibold text-navy-900 shadow-sm transition hover:bg-white"
          >
            <Printer className="h-3.5 w-3.5" /> Save &amp; print plan
          </button>
        </div>

        <div className="relative mt-4 flex items-center gap-4">
          <Avatar name={name || '?'} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-white">{name || 'New participant'}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-teal-50/90">
              <span>{convictionLabel}</span>
              <span className="text-teal-200/50">·</span>
              <span>{contextLabel}</span>
              {supervisionLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 font-semibold capitalize text-white ring-1 ring-white/20">
                  <ShieldCheck className="h-3 w-3" /> {supervisionLabel}
                </span>
              )}
            </div>
          </div>
          <div className="hidden sm:block"><ProgressRing pct={pct} size={60} stroke={5} /></div>
        </div>

        {/* quick stats */}
        <div className="relative mt-4 grid grid-cols-4 gap-2">
          <Stat label="Open" value={stats.open} />
          <Stat label="Overdue" value={stats.overdue} tone={stats.overdue ? 'rose' : 'plain'} />
          <Stat label="Matches" value={stats.matches} />
          <Stat label="Barriers" value={stats.barriers} tone={stats.barriers ? 'amber' : 'plain'} />
        </div>
      </div>

      {/* Next best action */}
      <button
        onClick={() => nba.anchor && onJump(nba.anchor)}
        className={
          'flex w-full items-start gap-3 px-5 py-4 text-left transition sm:px-6 ' +
          (urgent ? 'bg-rose-50/70 hover:bg-rose-50' : 'bg-teal-50/50 hover:bg-teal-50')
        }
      >
        <span className={'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ' + (urgent ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-700')}>
          {urgent ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Next best action</p>
          <p className="text-sm font-bold text-navy-900">{nba.label}</p>
          <p className="text-xs text-slate-600">{nba.reason}</p>
        </div>
        <span className="ml-auto self-center text-[11px] font-semibold text-slate-400">Go →</span>
      </button>
    </section>
  );
}

function Stat({ label, value, tone = 'plain' }: { label: string; value: number; tone?: 'plain' | 'rose' | 'amber' }) {
  const valueCls = tone === 'rose' ? 'text-rose-300' : tone === 'amber' ? 'text-amber-300' : 'text-white';
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur">
      <p className={`text-lg font-bold leading-none ${valueCls}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-teal-50/70">{label}</p>
    </div>
  );
}
