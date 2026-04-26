'use client';

import { useEffect, useState } from 'react';
import { CONVICTION_LABELS, USER_CONTEXT_OPTIONS, type ConvictionType, type UserContextMode } from '@dxp/shared';

/**
 * Printable Career Action Plan — pulls the prepared plan from
 * localStorage (set by /caseworker), renders a one-page printable
 * layout, and triggers `window.print()`.
 *
 * Designed for:
 *   - Correctional education staff
 *   - Reentry coordinators
 *   - Probation / parole staff
 *   - Workforce development partners
 *   - Case managers
 */
interface StoredPlan {
  name?: string;
  conviction?: ConvictionType;
  contextMode?: UserContextMode;
  location?: string;
  careerGoal?: string;
  notes?: string;
  generatedAt?: string;
  top?: Array<{
    source: { id: string; title: string; company: string; locationCity: string | null; locationRegion: string | null };
    rating: {
      score: number; label: string; summary: string;
      possibleBarriers: string[]; recommendedNextStep: string; chanceImprovers: string[];
    };
  }>;
  aggregatedSteps?: Array<{ id: string; title: string; reason: string; estDuration?: string }>;
  phases?: Array<{ label: string; actions: string[] }>;
}

export default function PlanPrintPage() {
  const [plan, setPlan] = useState<StoredPlan | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('dxp:caseworker:plan');
    if (raw) {
      try { setPlan(JSON.parse(raw)); } catch { setPlan(null); }
    }
    // Auto-trigger print after content paints (small delay so fonts load).
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);

  if (!plan) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-sm text-slate-600">
        <p>No plan to print. <a className="text-teal-700 underline" href="/caseworker">Open Caseworker Mode</a> first to build one.</p>
      </div>
    );
  }

  const generatedAt = plan.generatedAt ? new Date(plan.generatedAt).toLocaleString() : '—';

  return (
    <article className="mx-auto max-w-3xl bg-white p-8 text-[12px] leading-relaxed text-slate-900 print:p-6 print:text-[11px]">
      {/* Print-only print button hides itself when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-navy-900">Career Action Plan</h1>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
        >
          Print
        </button>
      </div>

      {/* Header block */}
      <header className="border-b border-slate-300 pb-3">
        <div className="hidden print:block">
          <h1 className="text-xl font-bold text-navy-900">Career Action Plan</h1>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <Detail label="Participant">{plan.name || '—'}</Detail>
          <Detail label="Date generated">{generatedAt}</Detail>
          <Detail label="Location">{plan.location || '—'}</Detail>
          <Detail label="Career goal">{plan.careerGoal || '—'}</Detail>
          <Detail label="Conviction class">{plan.conviction ? CONVICTION_LABELS[plan.conviction] : '—'}</Detail>
          <Detail label="Context">{plan.contextMode ? (USER_CONTEXT_OPTIONS.find((o) => o.value === plan.contextMode)?.label ?? '—') : '—'}</Detail>
        </dl>
      </header>

      {/* Top jobs */}
      <section className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Top 3 job matches</h2>
        <ol className="mt-2 space-y-2">
          {(plan.top ?? []).slice(0, 3).map(({ source, rating }, i) => (
            <li key={source.id} className="rounded border border-slate-200 p-2.5">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">{i + 1}. {source.title}</p>
                <span className="text-[11px] font-semibold text-slate-700">{rating.label} · {rating.score}%</span>
              </div>
              <p className="text-[11px] text-slate-600">{source.company} · {[source.locationCity, source.locationRegion].filter(Boolean).join(', ') || 'Location TBD'}</p>
              <p className="mt-1"><strong>Why this may be realistic:</strong> {rating.summary}</p>
              {rating.possibleBarriers[0] && <p className="mt-0.5"><strong>Main potential barrier:</strong> {rating.possibleBarriers[0]}</p>}
              <p className="mt-0.5"><strong>Recommended next step:</strong> {rating.recommendedNextStep}</p>
            </li>
          ))}
          {(!plan.top || plan.top.length === 0) && <li className="text-slate-500">No matches captured.</li>}
        </ol>
      </section>

      {/* Training */}
      <section className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Recommended training / certifications</h2>
        {(plan.aggregatedSteps ?? []).length === 0 ? (
          <p className="mt-1 text-slate-500">No common training gaps identified across the top matches.</p>
        ) : (
          <ul className="mt-1 list-disc pl-5">
            {plan.aggregatedSteps!.slice(0, 6).map((s) => (
              <li key={s.id}><strong>{s.title}</strong>{s.estDuration ? ` (${s.estDuration})` : ''} — {s.reason}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Local resources */}
      <section className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Local workforce resources</h2>
        <p className="mt-1">
          Visit the <em>Local Help</em> page for nearby American Job Centers, reentry programs,
          and apprenticeship offices in {plan.location || 'the participant\u2019s region'}. Caseworkers
          should confirm specific contacts before the participant arrives.
        </p>
      </section>

      {/* Phases */}
      <section className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">30 / 60 / 90-day plan</h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {(plan.phases ?? []).map((phase) => (
            <div key={phase.label} className="rounded border border-slate-200 p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-700">{phase.label}</p>
              <ul className="mt-1 space-y-1">
                {phase.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border border-slate-400" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Notes */}
      <section className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Caseworker notes</h2>
        <p className="mt-1 whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2.5 min-h-[3em]">
          {plan.notes || '\u2014'}
        </p>
      </section>

      <footer className="mt-6 border-t border-slate-300 pt-2 text-[10px] text-slate-500">
        Generated by AchieveDXP Workforce Navigator. This plan is informational and does not predict any specific employer&rsquo;s hiring decision. Confirm background-check policies and licensing rules with employers and licensing boards before applying.
      </footer>
    </article>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{children}</dd>
    </div>
  );
}
