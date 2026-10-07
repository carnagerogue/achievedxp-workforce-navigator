'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useNavigatorProfile } from '../../lib/navigator-profile';
import { useCompletedSteps } from '../../lib/reentry-store';
import { phaseProgress, type JourneyPhaseKey } from '../../lib/reentry-journey';
import { ContextBar, StepRow } from '../journey/CompassSections';
import { ProgressRing } from '../common/ProgressRing';

/**
 * The whole roadmap in one place: four phases in the order that tends to
 * work, every step checkable, the next one marked. The phase you are in opens
 * by default; a link to /plan#phase-<key> opens that phase instead.
 */
export function Roadmap() {
  const p = useNavigatorProfile();
  const completedArr = useCompletedSteps();
  const completed = new Set(completedArr);
  const phases = phaseProgress(p.journey.inputs, completed);
  const activeKey = p.journey.phaseKey as JourneyPhaseKey;
  const nextId = p.journey.next?.step.id;

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (key: string) => open[key] ?? key === activeKey;

  // Deep links from Home (#phase-earn) open and reveal that phase.
  useEffect(() => {
    const reveal = () => {
      const match = window.location.hash.match(/^#phase-(\w+)$/);
      if (!match) return;
      const key = match[1];
      setOpen((current) => ({ ...current, [key]: true }));
      window.requestAnimationFrame(() => document.getElementById(`phase-${key}`)?.scrollIntoView({ block: 'start' }));
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);

  return (
    <section id="roadmap" aria-labelledby="roadmap-heading" className="scroll-mt-32 overflow-hidden rounded-[20px] border border-slate-900/[0.08] bg-white">
      <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <h2 id="roadmap-heading" className="text-lg font-semibold text-navy-900">Your roadmap</h2>
          <p className="mt-0.5 text-sm text-slate-500">Four phases, in the order that tends to work. {p.journey.done} of {p.journey.total} steps done.</p>
        </div>
        <ProgressRing pct={p.journey.pct} size={56} stroke={5} />
      </div>

      <ContextBar inputs={p.journey.inputs} critical={p.inCriticalWindow} />

      <ol className="divide-y divide-slate-100 border-t border-slate-100">
        {phases.map(({ phase, steps, done, total, complete }, index) => {
          const current = phase.key === activeKey && !complete;
          const expanded = isOpen(phase.key);
          return (
            <li key={phase.key} id={`phase-${phase.key}`} className="scroll-mt-32">
              <button type="button" onClick={() => setOpen((s) => ({ ...s, [phase.key]: !expanded }))} aria-expanded={expanded} aria-controls={`phase-${phase.key}-steps`}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50/70 sm:px-6">
                <span aria-hidden="true" className={'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ' +
                  (complete ? 'bg-teal-600 text-white' : current ? 'bg-navy-900 text-white ring-4 ring-navy-900/10' : 'bg-slate-100 text-slate-500')}>
                  {complete ? <Check className="h-5 w-5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-navy-900">{phase.title}</span>
                    {current && <span className="rounded-full bg-sunset-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sunset-700 ring-1 ring-inset ring-sunset-200">You are here</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-500">{phase.tagline}</span>
                </span>
                <span className="hidden shrink-0 text-sm font-medium tabular-nums text-slate-500 sm:inline">{done} of {total}</span>
                <ChevronDown className={'h-5 w-5 shrink-0 text-slate-400 transition ' + (expanded ? 'rotate-180' : '')} aria-hidden="true" />
              </button>
              {expanded && (
                <div id={`phase-${phase.key}-steps`} className="px-5 pb-5 sm:pl-[5.25rem] sm:pr-6">
                  <p className="text-sm leading-relaxed text-slate-600">{phase.why}</p>
                  <ul className="mt-3 space-y-2.5">
                    {steps.map((step) => <StepRow key={step.id} step={step} done={completed.has(step.id)} isNext={step.id === nextId} />)}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
