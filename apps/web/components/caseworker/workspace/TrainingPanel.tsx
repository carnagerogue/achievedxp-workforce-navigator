'use client';

import { Wrench, Plus, Check } from 'lucide-react';
import type { TrainingBridgeStep } from '@dxp/shared';

export function TrainingPanel({
  steps, addedStepIds, onAdd,
}: {
  steps: TrainingBridgeStep[];
  addedStepIds: Set<string>;
  onAdd: (s: TrainingBridgeStep) => void;
}) {
  return (
    <section id="training" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
        <Wrench className="h-4 w-4 text-teal-600" /> Training gaps
        <span className="text-sm font-normal text-slate-400">({steps.length})</span>
      </h2>
      {steps.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No common credential gaps across the top matches.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {steps.map((s) => {
            const added = addedStepIds.has(`train:${s.id}`);
            return (
              <li key={s.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900">
                      {s.title}{s.estDuration ? <span className="ml-1.5 text-[11px] font-normal text-slate-400">· {s.estDuration}</span> : null}
                    </p>
                    {s.reason && <p className="mt-0.5 text-xs text-slate-600">{s.reason}</p>}
                    {s.externalUrl && (
                      <a href={s.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-block text-[11px] font-semibold text-teal-700 hover:underline">Learn more →</a>
                    )}
                  </div>
                  <button
                    onClick={() => onAdd(s)}
                    disabled={added}
                    className={
                      'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ' +
                      (added ? 'bg-teal-50 text-teal-700' : 'border border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700')
                    }
                  >
                    {added ? <><Check className="h-3 w-3" /> Added</> : <><Plus className="h-3 w-3" /> Add</>}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
