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
    <section className={'overflow-hidden rounded-2xl border shadow-card ' + (urgent ? 'border-rose-200' : 'border-amber-200')}>
      <div className={'px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white ' + (urgent ? 'bg-gradient-to-r from-rose-600 to-rose-500' : 'bg-gradient-to-r from-amber-500 to-amber-400')}>
        {urgent ? 'Do this first — it can’t wait' : 'Do this next — coming up'}
      </div>
      <div className={'p-5 ' + (urgent ? 'bg-rose-50/50' : 'bg-amber-50/40')}>
        <div className="flex items-start gap-3">
          <span className={'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + (urgent ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
            {urgent ? <AlertTriangle className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-navy-900">{entry.title}</h2>
            {entry.sub && <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{entry.sub}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {markMet ? (
                <button onClick={markMet} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                  <Check className="h-4 w-4" /> Mark it met
                </button>
              ) : entry.href ? (
                <Link href={entry.href} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                  Take care of it <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
