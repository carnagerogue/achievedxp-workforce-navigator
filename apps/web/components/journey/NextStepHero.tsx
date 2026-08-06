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
    ? 'group inline-flex items-center gap-1.5 rounded-full bg-teal-600 py-2.5 pl-5 pr-4 text-sm font-semibold text-white transition hover:bg-teal-700 active:scale-[0.98]'
    : 'inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-teal-600/40 hover:text-teal-700';
  const Icon = action.kind === 'tel' ? Phone : ArrowRight;
  if (action.kind === 'route') return <Link href={action.href} className={cls}>{action.label} <Icon className={'h-4 w-4' + (primary ? ' transition-transform duration-200 group-hover:translate-x-0.5' : '')} /></Link>;
  if (action.kind === 'tel') return <a href={action.href} className={cls}><Icon className="h-4 w-4" /> {action.label}</a>;
  return <a href={action.href} className={cls}>{action.label} <ArrowRight className="h-4 w-4" /></a>;
}

/** The single "do this next" Compass step — shared by the dashboard and /start. */
export function NextStepHero({ phase, step, onDone }: { phase: JourneyPhase; step: JourneyStep; onDone: () => void }) {
  const urgent = step.urgent;
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-900/[0.07] bg-white shadow-card">
      <div aria-hidden="true" className={'h-1 bg-gradient-to-r ' + PHASE_ACCENT[phase.key]} />
      <div className="p-6 sm:p-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          <span aria-hidden="true" className={'inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r ' + PHASE_ACCENT[phase.key]} />
          Do this next · {phase.title}
          {urgent && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-rose-600"><ShieldAlert className="h-2.5 w-2.5" /> Important</span>}
        </p>
        <h2 className="mt-2.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-[22px]">{step.title}</h2>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-slate-500">{step.why}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {step.action && <ActionButton action={step.action} primary />}
          <button onClick={onDone} className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-900/20 hover:text-slate-900">
            <Check className="h-4 w-4" /> Mark done
          </button>
        </div>
        <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
          <BookOpen className="mt-0.5 h-3 w-3 shrink-0" /> {step.evidence}
        </p>
      </div>
    </section>
  );
}
