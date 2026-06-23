'use client';

import Link from 'next/link';
import { ShieldAlert, Check, BookOpen, Phone, ArrowRight } from 'lucide-react';
import type { JourneyPhase, JourneyStep, JourneyAction } from '../../lib/reentry-journey';

/** Phase accent gradients — shared by the Compass rail and the next-step hero. */
export const PHASE_ACCENT: Record<string, string> = {
  stabilize: 'from-rose-500 to-orange-500',
  connect: 'from-violet-500 to-fuchsia-500',
  earn: 'from-teal-500 to-cyan-500',
  grow: 'from-emerald-500 to-teal-600',
};

export function ActionButton({ action, primary }: { action: JourneyAction; primary?: boolean }) {
  const cls = primary
    ? 'inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700'
    : 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700';
  const Icon = action.kind === 'tel' ? Phone : ArrowRight;
  if (action.kind === 'route') return <Link href={action.href} className={cls}>{action.label} <Icon className="h-4 w-4" /></Link>;
  if (action.kind === 'tel') return <a href={action.href} className={cls}><Icon className="h-4 w-4" /> {action.label}</a>;
  return <a href={action.href} className={cls}>{action.label} <ArrowRight className="h-4 w-4" /></a>;
}

/** The single "do this next" Compass step — shared by the dashboard and /start. */
export function NextStepHero({ phase, step, onDone }: { phase: JourneyPhase; step: JourneyStep; onDone: () => void }) {
  const urgent = step.urgent;
  return (
    <section className={'overflow-hidden rounded-2xl border shadow-card ' + (urgent ? 'border-rose-200' : 'border-slate-200')}>
      <div className={'px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-white bg-gradient-to-r ' + PHASE_ACCENT[phase.key]}>
        Do this next · {phase.title}
      </div>
      <div className="bg-white p-5">
        <div className="flex items-start gap-3">
          {urgent && <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><ShieldAlert className="h-5 w-5" /></span>}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-navy-900">{step.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.why}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {step.action && <ActionButton action={step.action} primary />}
              <button onClick={onDone} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700">
                <Check className="h-4 w-4" /> Mark done
              </button>
            </div>
            <p className="mt-3 inline-flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] leading-snug text-slate-500">
              <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" /> Why this matters: {step.evidence}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
