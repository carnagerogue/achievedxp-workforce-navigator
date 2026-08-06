'use client';

/**
 * The single "do this next" hero — renders the head of the unified focus
 * queue (lib/focus.ts). When the top item is the compass step it reuses the
 * evidence-backed NextStepHero; when something time-critical outranks it
 * (an overdue report, condition, or fee) the hero switches to an urgent
 * treatment so the one thing that most needs doing is unmissable.
 */
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, Check, Star } from 'lucide-react';
import type { FocusEntry } from '../../lib/focus';
import { NextStepHero } from './NextStepHero';
import { setStepDone } from '../../lib/reentry-store';
import { useConditions, updateCondition } from '../../lib/checklist-store';
import { advanceCondition } from '../../lib/supervision';

export function FocusHero({ entry }: { entry: FocusEntry | null }) {
  const conditions = useConditions();

  if (!entry) {
    return (
      <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 text-center shadow-card">
        <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700"><Star className="h-5 w-5" /></span>
        <p className="mt-2 text-sm font-bold text-navy-900">Nothing needs you right now.</p>
        <p className="mt-0.5 text-sm text-slate-600">You’ve worked every step here — keep your plan moving and your job steady.</p>
      </section>
    );
  }

  if (entry.kind === 'compass' && entry.journey) {
    return (
      <NextStepHero
        phase={entry.journey.phase}
        step={entry.journey.step}
        onDone={() => setStepDone(entry.journey!.step.id, true)}
      />
    );
  }

  const urgent = entry.tone === 'overdue';
  const markMet = entry.conditionId
    ? () => {
        const c = conditions.find((x) => x.id === entry.conditionId);
        if (c) updateCondition(c.id, advanceCondition(c));
      }
    : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-900/[0.07] bg-white shadow-card">
      <div aria-hidden="true" className={'h-1 ' + (urgent ? 'bg-rose-500' : 'bg-amber-400')} />
      <div className="p-6 sm:p-7">
        <p className={'flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ' + (urgent ? 'text-rose-600' : 'text-amber-600')}>
          {urgent ? <AlertTriangle className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
          {urgent ? 'Do this first — it can’t wait' : 'Do this next — coming up'}
        </p>
        <h2 className="mt-2.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-[22px]">{entry.title}</h2>
        {entry.sub && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-slate-500">{entry.sub}</p>}
        <div className="mt-5 flex flex-wrap gap-2.5">
          {markMet ? (
            <button onClick={markMet} className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
              <Check className="h-4 w-4" /> Mark it met
            </button>
          ) : entry.href ? (
            <Link href={entry.href} className="group inline-flex items-center gap-1.5 rounded-full bg-teal-600 py-2.5 pl-5 pr-4 text-sm font-semibold text-white transition hover:bg-teal-700">
              Take care of it <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
