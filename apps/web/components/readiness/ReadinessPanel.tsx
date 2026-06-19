'use client';

import {
  Gauge, FileText, Home, Bus, HeartPulse, Scale, GraduationCap, Award,
  Briefcase, Laptop, Wallet, Users, Sparkles, Plus, Check, ArrowRight,
} from 'lucide-react';
import { ProgressRing } from '../common/ProgressRing';
import {
  BAND_LABEL, type ReadinessResult, type ReadinessDomainKey, type DomainStatus, type DomainResult,
} from '../../lib/readiness';

const DOMAIN_ICON: Record<ReadinessDomainKey, typeof Home> = {
  id_documents: FileText, housing: Home, transportation: Bus, health_recovery: HeartPulse,
  legal_compliance: Scale, education: GraduationCap, credentials_skills: Award,
  work_readiness: Briefcase, digital_literacy: Laptop, finances: Wallet, support_network: Users,
};

const STATUS_OPTS: { value: DomainStatus; label: string }[] = [
  { value: 'not_ready', label: 'Not ready' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'na', label: 'N/A' },
];
const STATUS_CLS: Record<DomainStatus, string> = {
  not_ready: 'border-rose-300 bg-rose-50 text-rose-700',
  in_progress: 'border-amber-300 bg-amber-50 text-amber-700',
  ready: 'border-teal-400 bg-teal-50 text-teal-700',
  na: 'border-slate-300 bg-slate-50 text-slate-500',
};

const BAND_TONE: Record<string, string> = {
  early: 'text-rose-200', developing: 'text-amber-200', 'near-ready': 'text-teal-100', ready: 'text-teal-50',
};

export function ReadinessPanel({
  result, onSetStatus, onAddGap, addedGapKeys,
}: {
  result: ReadinessResult;
  onSetStatus: (domain: ReadinessDomainKey, status: DomainStatus) => void;
  onAddGap: (gap: DomainResult) => void;
  addedGapKeys: Set<string>;
}) {
  const readyCount = result.domains.filter((d) => d.status === 'ready').length;
  const naCount = result.domains.filter((d) => d.status === 'na').length;
  const applicable = result.domains.length - naCount;

  return (
    <section id="readiness" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 px-5 py-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_90%_-20%,rgba(45,212,229,0.25),transparent)]" />
        <div className="relative flex items-center gap-4">
          <ProgressRing pct={result.score} size={64} stroke={6} />
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-200">
              <Gauge className="h-3.5 w-3.5" /> Readiness
            </p>
            <h2 className={`mt-0.5 text-xl font-bold ${BAND_TONE[result.band]}`}>{BAND_LABEL[result.band]}</h2>
            <p className="mt-0.5 text-xs text-teal-50/80">{readyCount} of {applicable} domains ready · {result.gaps.length} to work on</p>
          </div>
        </div>
      </div>

      {/* Prioritized gaps */}
      {result.gaps.length > 0 && (
        <div className="border-b border-slate-100 bg-amber-50/30 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-900"><Sparkles className="h-4 w-4 text-amber-600" /> What&rsquo;s needed to get ready</p>
          <ul className="mt-2 space-y-1.5">
            {result.gaps.slice(0, 5).map((g) => {
              const added = addedGapKeys.has(`readiness:${g.key}`);
              return (
                <li key={g.key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                  <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${g.status === 'not_ready' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{g.gap?.label ?? g.label}</p>
                    <p className="truncate text-xs text-slate-500">{g.label}</p>
                  </div>
                  <button
                    onClick={() => onAddGap(g)}
                    disabled={added}
                    className={
                      'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ' +
                      (added ? 'bg-teal-50 text-teal-700' : 'bg-navy-900 text-white hover:bg-navy-800')
                    }
                  >
                    {added ? <><Check className="h-3 w-3" /> In plan</> : <><Plus className="h-3 w-3" /> Add to plan</>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Domain breakdown */}
      <div className="divide-y divide-slate-100">
        {result.domains.map((d) => {
          const Icon = DOMAIN_ICON[d.key];
          return (
            <div key={d.key} className="flex items-start gap-3 px-5 py-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-navy-900">{d.label}</p>
                  {d.auto && d.status !== 'na' && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">auto</span>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{d.whatReady}</p>
                {d.gap && d.gap.url && (
                  <a href={d.gap.url} className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-700 hover:underline">
                    {d.gap.label} <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
              <select
                value={d.status}
                onChange={(e) => onSetStatus(d.key, e.target.value as DomainStatus)}
                className={'shrink-0 cursor-pointer rounded-full border px-2 py-1 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 ' + STATUS_CLS[d.status]}
              >
                {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
