'use client';

/**
 * The one "do this next" card at the top of Home — the head of the unified
 * focus queue (lib/focus.ts). Usually that is the next roadmap step; when a
 * deadline outranks it (an overdue report, condition or fee) the card says so
 * plainly and offers the one action that resolves it. Everything else waits
 * below, so the most important thing is never one of many.
 */
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, Check, CheckCircle2, Circle, PartyPopper } from 'lucide-react';
import type { FocusEntry } from '../../lib/focus';
import type { PhaseProgress } from '../../lib/reentry-journey';
import { ActionButton } from './NextStepHero';
import { setStepDone } from '../../lib/reentry-store';
import { useConditions, updateCondition } from '../../lib/checklist-store';
import { advanceCondition } from '../../lib/supervision';

const PRIMARY = 'group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-300 px-6 py-3 text-sm font-bold text-navy-900 transition hover:-translate-y-0.5 hover:bg-teal-200 active:translate-y-0';
const SECONDARY = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10';

export function FocusHero({ entry, journeyDone, journeyTotal, phases, completed }: {
  entry: FocusEntry | null;
  journeyDone: number;
  journeyTotal: number;
  phases: PhaseProgress[];
  completed: Set<string>;
}) {
  const conditions = useConditions();

  if (!entry) {
    return (
      <HeroShell tone="done">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-200">
            <PartyPopper className="h-4 w-4" aria-hidden="true" /> Roadmap complete
          </p>
          <h2 className="mt-4 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[38px]">You&apos;ve worked every step. That&apos;s real progress.</h2>
          <p className="mt-4 text-base leading-7 text-slate-300">Keep your plan moving, follow up on applications, and look for your next step up.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/learn" className={PRIMARY}>Find a skill that raises your pay <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/plan" className={SECONDARY}>Open my plan</Link>
          </div>
        </div>
      </HeroShell>
    );
  }

  const journey = entry.kind === 'compass' ? entry.journey : undefined;
  const urgent = entry.tone === 'overdue';
  const soon = entry.tone === 'soon';
  const eyebrow = urgent
    ? 'Do this first — it can’t wait'
    : soon
    ? 'Coming up this week'
    : journey
    ? `Your next step · Step ${Math.min(journeyDone + 1, journeyTotal)} of ${journeyTotal}`
    : 'Your next step';
  const markMet = entry.conditionId
    ? () => {
        const c = conditions.find((x) => x.id === entry.conditionId);
        if (c) updateCondition(c.id, advanceCondition(c));
      }
    : null;

  const phaseIndex = journey ? phases.findIndex((p) => p.phase.key === journey.phase.key) : -1;
  const phase = phaseIndex >= 0 ? phases[phaseIndex] : null;

  return (
    <HeroShell tone={urgent ? 'urgent' : soon ? 'soon' : 'go'}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-stretch">
        <div className="min-w-0">
          <p className={'flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] ' + (urgent ? 'text-rose-300' : soon ? 'text-amber-200' : 'text-teal-200')}>
            {urgent ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : soon ? <CalendarClock className="h-4 w-4" aria-hidden="true" /> : <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sunset-400" />}
            {eyebrow}
          </p>
          <h2 id="next-step-title" className="mt-4 max-w-2xl text-[28px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">{entry.title}</h2>
          {entry.sub && <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">{entry.sub}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {markMet ? (
              <button type="button" onClick={markMet} className={PRIMARY}><Check className="h-4 w-4" aria-hidden="true" /> Mark it done</button>
            ) : journey?.step.action ? (
              <ActionButton action={journey.step.action} primary className={PRIMARY} />
            ) : entry.href ? (
              <Link href={entry.href} className={PRIMARY}>{urgent || soon ? 'Take care of it' : 'Open'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
            ) : null}
            {journey ? (
              <button type="button" onClick={() => setStepDone(journey.step.id, true)} aria-label={`Mark ${journey.step.title} done`} className={SECONDARY}>
                <Check className="h-4 w-4" aria-hidden="true" /> I&apos;ve done this
              </button>
            ) : (
              <Link href="/plan" className={SECONDARY}>See my plan</Link>
            )}
          </div>

          {journey && (
            <details className="group mt-7 max-w-xl text-sm">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-semibold text-slate-400 transition hover:text-white [&::-webkit-details-marker]:hidden">
                Why this step matters <ArrowRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
              </summary>
              <p className="mt-2 leading-6 text-slate-400">{journey.step.evidence}</p>
            </details>
          )}
        </div>

        {phase && journey && (
          <aside aria-label="This phase" className="hidden flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-5 lg:flex">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Phase {phaseIndex + 1} of {phases.length}</p>
            <p className="mt-2 text-lg font-semibold leading-snug text-white">{phase.phase.title}</p>
            <p className="mt-1 text-sm text-slate-400">{phase.phase.tagline}</p>
            <ul className="mt-5 space-y-2.5">
              {phase.steps.slice(0, 5).map((step) => {
                const current = step.id === journey.step.id;
                const done = completed.has(step.id);
                return (
                  <li key={step.id} className={'flex items-start gap-2.5 text-sm ' + (current ? 'font-semibold text-white' : done ? 'text-slate-400 line-through decoration-slate-500' : 'text-slate-400')}>
                    {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
                      : current ? <span aria-hidden="true" className="mt-1 inline-flex h-3 w-3 shrink-0 rounded-full border-2 border-sunset-400 bg-sunset-400/30" />
                      : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />}
                    <span>{step.title}</span>
                  </li>
                );
              })}
            </ul>
            <Link href={`/plan#phase-${phase.phase.key}`} className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-semibold text-teal-200 hover:text-white">
              See this phase in my plan <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </aside>
        )}
      </div>
    </HeroShell>
  );
}

function HeroShell({ tone, children }: { tone: 'go' | 'soon' | 'urgent' | 'done'; children: React.ReactNode }) {
  const glow = tone === 'urgent' ? 'bg-rose-500/25' : tone === 'soon' ? 'bg-amber-400/20' : 'bg-teal-400/25';
  return (
    <section aria-labelledby="next-step-title" className="next-step relative isolate overflow-hidden rounded-[24px] bg-navy-900 p-6 text-white shadow-pop sm:p-9 lg:p-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className={'absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full blur-3xl ' + glow} />
        <div className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-sunset-500/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
      </div>
      {children}
    </section>
  );
}
