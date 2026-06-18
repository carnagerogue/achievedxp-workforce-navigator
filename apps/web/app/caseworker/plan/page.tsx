'use client';

import { useEffect, useState } from 'react';
import { CONVICTION_LABELS, USER_CONTEXT_OPTIONS } from '@dxp/shared';
import type { Participant } from '../../../lib/caseworker-store';
import { BARRIER_LABELS } from '../../../lib/caseworker-store';

/**
 * Printable participant action plan — pulls the prepared plan from
 * localStorage (set by /caseworker), renders a one-page case document, and
 * triggers window.print(). Built for reentry coordinators, probation/parole
 * staff, workforce partners, and case managers.
 */
interface StoredPlan {
  participant: Participant;
  generatedAt?: string;
  guidance?: string;
  top?: Array<{ title: string; company: string; city: string | null; region: string | null; score: number; label: string; why: string; flags: string[] }>;
  aggregatedSteps?: Array<{ id: string; title: string; reason: string; estDuration?: string }>;
  phases?: Array<{ title: string; items: string[] }>;
  resources?: Array<{ label: string; resources: Array<{ name: string; phone?: string; url?: string }> }>;
}

export default function PlanPrintPage() {
  const [plan, setPlan] = useState<StoredPlan | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('dxp:caseworker:plan');
    if (raw) { try { setPlan(JSON.parse(raw)); } catch { setPlan(null); } }
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

  const p = plan.participant;
  const generatedAt = plan.generatedAt ? new Date(plan.generatedAt).toLocaleString() : '—';
  const contextLabel = USER_CONTEXT_OPTIONS.find((o) => o.value === p.contextMode)?.label ?? p.contextMode;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[13px] leading-relaxed text-slate-900 print:p-0">
      <style>{`@media print { @page { margin: 16mm; } .no-print { display:none } a { color: inherit; text-decoration: none } }`}</style>

      <header className="border-b-2 border-slate-800 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Achieve DXP · Workforce Navigator</p>
        <h1 className="mt-1 text-2xl font-bold">Participant Career Action Plan</h1>
        <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate-600">
          <p><span className="font-semibold text-slate-900">Participant:</span> {p.name || '—'}</p>
          <p><span className="font-semibold text-slate-900">Prepared:</span> {generatedAt}</p>
          <p><span className="font-semibold text-slate-900">Conviction:</span> {CONVICTION_LABELS[p.conviction]}</p>
          <p><span className="font-semibold text-slate-900">Status:</span> {contextLabel}{p.supervision !== 'none' ? ` · ${p.supervision.replace(/_/g, ' ')}` : ''}</p>
          {p.careerGoal && <p><span className="font-semibold text-slate-900">Career goal:</span> {p.careerGoal}</p>}
          {p.location && <p><span className="font-semibold text-slate-900">Area:</span> {p.location}</p>}
        </div>
        {plan.guidance && <p className="mt-2 rounded bg-teal-50 px-2.5 py-1.5 text-xs text-teal-900">{plan.guidance}</p>}
      </header>

      {/* Realistic matches */}
      <Section title="Realistic job matches">
        {(plan.top ?? []).length === 0 ? <p className="text-slate-500">No matches captured.</p> : (
          <ol className="space-y-2">
            {(plan.top ?? []).slice(0, 6).map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold text-slate-400">{i + 1}.</span>
                <div>
                  <p className="font-semibold">{t.title} <span className="font-normal text-slate-500">— {t.company}{[t.city, t.region].filter(Boolean).length ? `, ${[t.city, t.region].filter(Boolean).join(', ')}` : ''}</span></p>
                  <p className="text-xs text-slate-600">{t.label} · {t.score}% — {t.why}</p>
                  {t.flags.length > 0 && <p className="text-xs text-amber-700">⚠ {t.flags[0]}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* 30/60/90 or pre-release plan */}
      {(plan.phases ?? []).length > 0 && (
        <Section title="Action plan">
          <div className="grid grid-cols-3 gap-4">
            {(plan.phases ?? []).map((ph) => (
              <div key={ph.title}>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{ph.title}</p>
                <ul className="mt-1 space-y-1">
                  {ph.items.map((it, i) => <li key={i} className="flex gap-1.5 text-xs"><span>☐</span> {it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Training gaps */}
      {(plan.aggregatedSteps ?? []).length > 0 && (
        <Section title="Credentials & training to pursue">
          <ul className="space-y-1">
            {(plan.aggregatedSteps ?? []).slice(0, 6).map((s) => (
              <li key={s.id} className="flex gap-1.5 text-xs"><span>☐</span><span><span className="font-semibold">{s.title}</span>{s.estDuration ? ` (${s.estDuration})` : ''} — {s.reason}</span></li>
            ))}
          </ul>
        </Section>
      )}

      {/* Barriers / local resources */}
      {(plan.resources ?? []).length > 0 && (
        <Section title="Support resources for identified barriers">
          {p.barriers.length > 0 && <p className="mb-1 text-xs text-slate-500">Barriers flagged: {p.barriers.map((b) => BARRIER_LABELS[b]).join(', ')}</p>}
          <div className="grid grid-cols-2 gap-3">
            {(plan.resources ?? []).map((r) => (
              <div key={r.label}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{r.label}</p>
                <ul className="mt-0.5 space-y-0.5">
                  {r.resources.slice(0, 2).map((res, i) => (
                    <li key={i} className="text-xs"><span className="font-semibold">{res.name}</span>{res.phone ? ` · ${res.phone}` : ''}{res.url ? ` · ${res.url.replace(/^https?:\/\//, '')}` : ''}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {p.notes && <Section title="Caseworker notes"><p className="whitespace-pre-wrap text-xs">{p.notes}</p></Section>}

      <div className="mt-8 flex gap-12">
        <div className="flex-1 border-t border-slate-400 pt-1 text-xs text-slate-500">Participant signature / date</div>
        <div className="flex-1 border-t border-slate-400 pt-1 text-xs text-slate-500">Caseworker / officer signature / date</div>
      </div>
      <p className="mt-4 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
        Scores are deterministic and re-computed against the participant&rsquo;s conviction, goal, and realistic attainability.
        Job data from the U.S. Department of Labor (CareerOneStop) and public job boards; support resources are vetted national programs and official government locators.
      </p>

      <button onClick={() => window.print()} className="no-print mt-6 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white">Print again</button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-slate-800">{title}</h2>
      {children}
    </section>
  );
}
