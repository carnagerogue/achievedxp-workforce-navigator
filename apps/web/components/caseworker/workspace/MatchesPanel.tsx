'use client';

import { CheckCircle2, AlertTriangle, ShieldAlert, Plus, Check, MapPin, SearchX } from 'lucide-react';
import { CONVICTION_LABELS, type ConvictionType } from '@dxp/shared';
import type { ScoredCaseJob } from '../../../lib/caseworker';

export function MatchesPanel({
  conviction, top, barriersJobs, loading, hasZip, addedJobIds, onAdd,
}: {
  conviction: ConvictionType;
  top: ScoredCaseJob[];
  barriersJobs: ScoredCaseJob[];
  loading: boolean;
  hasZip: boolean;
  addedJobIds: Set<string>;
  onAdd: (m: ScoredCaseJob) => void;
}) {
  return (
    <section id="matches" className="scroll-mt-24 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <CheckCircle2 className="h-4 w-4 text-teal-600" /> Realistic matches
          <span className="text-sm font-normal text-slate-400">({top.length})</span>
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Re-scored against {CONVICTION_LABELS[conviction].toLowerCase()}, the career goal, and realistic attainability.
        </p>
        {!hasZip && (
          <EmptyState
            Icon={MapPin}
            title="Add a ZIP to see local roles"
            body="Enter a 5-digit ZIP in the profile above and matches will appear here — re-scored for this person's record and goal."
          />
        )}
        {hasZip && loading && (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        )}
        {hasZip && !loading && top.length === 0 && (
          <EmptyState
            Icon={SearchX}
            title="No realistic matches in this area yet"
            body="Try a broader ZIP, adjust the career goal, or check the “Likely barriers” list — strong-on-paper roles flagged for a legal/employer barrier."
          />
        )}
        <ul className="mt-4 space-y-3">
          {top.map((m) => {
            const added = addedJobIds.has(m.job.id);
            const tone = m.chance === 'high' ? 'bg-teal-50 text-teal-700 ring-teal-200' : 'bg-sky-50 text-sky-700 ring-sky-200';
            const loc = [m.job.locationCity, m.job.locationRegion].filter(Boolean).join(', ');
            return (
              <li key={m.job.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900">{m.job.title}</p>
                    <p className="text-xs text-slate-500">{m.job.company}{loc ? ` · ${loc}` : ''}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone}`}>{m.label} · {m.score}%</span>
                </div>
                <p className="mt-2 text-xs text-slate-600"><span className="font-semibold text-slate-700">Why:</span> {m.why}</p>
                {m.flags.length > 0 && (
                  <p className="mt-1 inline-flex items-start gap-1 text-xs text-amber-700"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {m.flags[0]}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => onAdd(m)}
                    disabled={added}
                    className={
                      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ' +
                      (added ? 'bg-teal-50 text-teal-700' : 'bg-navy-900 text-white hover:bg-navy-800')
                    }
                  >
                    {added ? <><Check className="h-3 w-3" /> In plan</> : <><Plus className="h-3 w-3" /> Add to plan</>}
                  </button>
                  <a href={`/jobs/${m.job.id}?from=caseworker`} className="text-[11px] font-semibold text-teal-700 hover:underline">View job →</a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {barriersJobs.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
            <ShieldAlert className="h-4 w-4 text-amber-600" /> Likely barriers — don&rsquo;t waste the visit
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">High-ranking on paper, but flagged for a legal/employer barrier. Coach the participant before they apply.</p>
          <ul className="mt-4 space-y-2">
            {barriersJobs.map((m) => (
              <li key={m.job.id} className="rounded-xl border border-amber-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-900">{m.job.title}</p>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{m.label}</span>
                </div>
                <p className="text-xs text-slate-500">{m.job.company}</p>
                <p className="mt-1 inline-flex items-start gap-1 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {m.flags[0]}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EmptyState({ Icon, title, body }: { Icon: typeof MapPin; title: string; body: string }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-8 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-600 ring-1 ring-slate-200">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-navy-900">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{body}</p>
    </div>
  );
}
