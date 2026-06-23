'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, ChevronDown, Info, ListChecks,
  GraduationCap, HardHat,
} from 'lucide-react';
import type { DecisionSupport, FieldConfidence } from '@dxp/shared';
import { DecisionBadge } from './DecisionBadge';

const STATUS_TONE: Record<FieldConfidence, string> = {
  verified: 'bg-teal-50 text-teal-700',
  inferred: 'bg-amber-50 text-amber-700',
  uncertain: 'bg-slate-100 text-slate-500',
};
const STATUS_WORD: Record<FieldConfidence, string> = {
  verified: 'From the posting', inferred: 'Inferred', uncertain: 'Unknown',
};

/**
 * "Fit and next steps" — decision support sourced entirely from classification
 * evidence. Distinguishes posting evidence, inference, and unknowns; never
 * implies a hiring outcome. The evidence/audit trail defaults open for
 * caseworkers and is optional for jobseekers.
 */
export function FitAndNextSteps({
  decision, defaultEvidenceOpen = false,
}: {
  decision: DecisionSupport;
  defaultEvidenceOpen?: boolean;
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(defaultEvidenceOpen);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
          <ListChecks className="h-5 w-5 text-teal-600" /> Fit &amp; next steps
        </h2>
        <DecisionBadge band={decision.band} label={decision.label} />
      </div>
      <p className="mt-2 text-sm text-slate-700">{decision.reason}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Block icon={CheckCircle2} tone="teal" title="Why this may work" items={decision.why} empty="No clear positives detected in the posting." />
        <Block icon={AlertTriangle} tone="amber" title="What to verify before applying" items={decision.verify} empty="Nothing specific flagged to verify." />
        <Block icon={HelpCircle} tone="slate" title="Missing or uncertain" items={decision.unknowns} empty="The posting covers the key points." />
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800">
            <ArrowRight className="h-3.5 w-3.5" /> Recommended next action
          </p>
          <p className="mt-1.5 text-sm font-medium text-navy-900">{decision.nextAction}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Link href="/learn" className="inline-flex items-center gap-1 rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50"><GraduationCap className="h-3 w-3" /> Build the skills</Link>
            <Link href="/apprenticeships" className="inline-flex items-center gap-1 rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50"><HardHat className="h-3 w-3" /> Apprenticeships</Link>
          </div>
        </div>
      </div>

      {/* Evidence / audit trail */}
      <div className="mt-4 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setEvidenceOpen((o) => !o)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-slate-700"
          aria-expanded={evidenceOpen}
        >
          <span className="inline-flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-slate-400" /> How we reached this (evidence)</span>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition ${evidenceOpen ? 'rotate-180' : ''}`} />
        </button>
        {evidenceOpen && (
          <ul className="space-y-1.5 border-t border-slate-200 p-3">
            {decision.evidence.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-navy-900">{e.label}:</span>
                <span className="text-slate-700">{e.value}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_TONE[e.status]}`}>{STATUS_WORD[e.status]}</span>
                <span className="text-slate-400">— {e.basis}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs italic text-slate-500">{decision.disclaimer}</p>
    </section>
  );
}

function Block({
  icon: Icon, tone, title, items, empty,
}: {
  icon: typeof CheckCircle2; tone: 'teal' | 'amber' | 'slate'; title: string; items: string[]; empty: string;
}) {
  const toneCls = tone === 'teal' ? 'text-teal-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-500';
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${toneCls}`}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-1.5 text-xs text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {items.map((t, i) => <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" /> {t}</li>)}
        </ul>
      )}
    </div>
  );
}
