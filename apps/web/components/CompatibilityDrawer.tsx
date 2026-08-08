'use client';

import { useEffect, useMemo } from 'react';
import { X, AlertTriangle, CheckCircle2, ShieldAlert, Lightbulb, ClipboardList, ListChecks, Wrench, Building2, Scale, ExternalLink } from 'lucide-react';
import type { CompatibilityRating, ConvictionType, JobInput, CandidateProfile, TrainingBridgeStep } from '@dxp/shared';
import { CONVICTION_LABELS as LABELS, buildTrainingBridge } from '@dxp/shared';

/**
 * Detailed compatibility breakdown shown when the user clicks the chance
 * chip on a job card. Renders the full audit trail so a caseworker can
 * walk through the rules that fired.
 *
 * Designed to slide in from the right on desktop and full-screen on
 * mobile. Uses the same teal/slate palette as the rest of the app.
 *
 * Wording rule: never use stigmatizing terminology in any user-facing
 * surface. The compatibility engine guarantees it; this component
 * trusts that and just renders.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  rating: CompatibilityRating | null;
  jobTitle: string;
  company: string;
  conviction: ConvictionType | null;
  /** Optional — when provided, the drawer renders a Training Bridge panel. */
  job?: JobInput;
  candidate?: CandidateProfile;
}

const CHANCE_STYLES: Record<CompatibilityRating['chance'], { ring: string; bg: string; text: string; label: string }> = {
  high:   { ring: 'ring-emerald-300', bg: 'bg-emerald-50',  text: 'text-emerald-700', label: 'Strong Match' },
  medium: { ring: 'ring-amber-300',   bg: 'bg-amber-50',    text: 'text-amber-700',   label: 'Possible Match' },
  low:    { ring: 'ring-rose-300',    bg: 'bg-rose-50',     text: 'text-rose-700',    label: 'Challenging Match' },
};

export function CompatibilityDrawer({ open, onClose, rating, jobTitle, company, conviction, job, candidate }: Props) {
  // Compute Training Bridge once per (job, candidate) pair. Cheap & pure.
  const bridge = useMemo(() => {
    if (!job) return null;
    return buildTrainingBridge(candidate ?? { convictionType: conviction ?? undefined }, job);
  }, [job, candidate, conviction]);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !rating) return null;
  const style = CHANCE_STYLES[rating.chance];
  const convictionLabel = conviction ? LABELS[conviction] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compat-drawer-title"
      className="fixed inset-0 z-40 flex"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close compatibility details"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Compatibility detail
              </p>
              <h2 id="compat-drawer-title" className="mt-0.5 truncate text-base font-semibold text-slate-900">
                {jobTitle}
              </h2>
              <p className="truncate text-sm text-slate-600">{company}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Big score row */}
          <div className="mt-4 flex items-center gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ring-4 ${style.ring} ${style.bg}`}>
              <span className={`text-xl font-semibold ${style.text}`}>{rating.score}</span>
            </div>
            <div className="min-w-0">
              <p className={`text-base font-semibold ${style.text}`}>{style.label}</p>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Risk level: {rating.riskLevel.replace('_', ' ')}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {convictionLabel ? `Scored against: ${convictionLabel}` : 'Fit estimate based on the profile details available.'}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-700">{rating.summary}</p>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-12 space-y-6">
          {/* Evidence-backed eligibility checks */}
          <Section title="Eligibility checks" icon={<Scale className="h-4 w-4 text-teal-700" />} tone="slate">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <EligibilityStatusBadge status={rating.eligibility.highestStatus} />
              {rating.eligibility.jurisdiction && (
                <span className="text-xs text-slate-500">Job state: {rating.eligibility.jurisdiction}</span>
              )}
            </div>
            <div className="space-y-3">
              {rating.eligibility.findings.map((item) => (
                <div key={item.ruleId} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {item.scope.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.explanation}</p>
                  <p className="mt-2 text-xs text-slate-700">
                    <span className="font-semibold">Verify:</span> {item.whatToVerify}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {item.sources.map((source) => (
                      <a
                        key={`${item.ruleId}-${source.url}`}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:underline"
                      >
                        {source.citation} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {rating.eligibility.missingFacts.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                <span className="font-semibold">Accuracy is limited without:</span>{' '}
                {rating.eligibility.missingFacts.join(', ')}.
              </div>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{rating.eligibility.disclaimer}</p>
          </Section>

          {/* Recommended next step */}
          <Section title="Recommended next step" icon={<Lightbulb className="h-4 w-4" />}>
            <p className="text-sm text-slate-700">{rating.recommendedNextStep}</p>
          </Section>

          {/* Score breakdown */}
          <Section title="Score breakdown" icon={<ListChecks className="h-4 w-4" />}>
            <div className="space-y-2">
              {Object.entries(rating.scoreBreakdown).map(([key, c]) => (
                <Component key={key} keyName={key} component={c} />
              ))}
            </div>
          </Section>

          {/* Risk factors */}
          {rating.riskFactors.length > 0 && (
            <Section title="Potential concerns" icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} tone="rose">
              <BulletList items={rating.riskFactors} />
            </Section>
          )}

          {/* Positive factors */}
          {rating.positiveFactors.length > 0 && (
            <Section title="Positive factors" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} tone="emerald">
              <BulletList items={rating.positiveFactors} />
            </Section>
          )}

          {/* Possible barriers */}
          {rating.possibleBarriers.length > 0 && (
            <Section title="What could block this job" icon={<ShieldAlert className="h-4 w-4 text-rose-600" />} tone="rose">
              <BulletList items={rating.possibleBarriers} />
            </Section>
          )}

          {/* Chance improvers */}
          {rating.chanceImprovers.length > 0 && (
            <Section title="What improves your chance" icon={<Lightbulb className="h-4 w-4 text-amber-600" />} tone="amber">
              <BulletList items={rating.chanceImprovers} />
            </Section>
          )}

          {/* Training Bridge — concrete pathway to close gaps */}
          {bridge && (bridge.steps.length > 0 || bridge.steppingStone) && (
            <Section title="Training Bridge" icon={<Wrench className="h-4 w-4 text-teal-600" />} tone="emerald">
              {bridge.gaps.length > 0 && (
                <p className="mb-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Identified gaps:</span> {bridge.gaps.join(', ')}.
                </p>
              )}
              {bridge.steppingStone && (
                <div className="mb-2 rounded-md border border-emerald-200 bg-white p-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Stepping stone</p>
                  <p className="text-sm font-medium text-slate-800">{bridge.steppingStone.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{bridge.steppingStone.reason}</p>
                </div>
              )}
              <ol className="space-y-2">
                {bridge.steps.map((s, idx) => (
                  <BridgeStepLi key={s.id} index={idx + 1} step={s} />
                ))}
              </ol>
            </Section>
          )}

          {/* Caseworker notes */}
          {rating.caseworkerNotes.length > 0 && (
            <Section title="Caseworker / auditor notes" icon={<ClipboardList className="h-4 w-4 text-slate-600" />} tone="slate">
              <BulletList items={rating.caseworkerNotes} />
            </Section>
          )}

          {/* Audit trail */}
          <Section title="Audit trail" icon={<ListChecks className="h-4 w-4" />}>
            <p className="mb-2 text-xs text-slate-500">Every rule that fired, with its impact in points. Use to reproduce the score.</p>
            <ul className="space-y-1 text-xs text-slate-700">
              {rating.auditTrail.map((a, idx) => (
                <li key={idx} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                  <span className="font-mono text-[10px] text-slate-500">{a.ruleId}</span>{' '}
                  <span className={a.impact > 0 ? 'text-emerald-700' : a.impact < 0 ? 'text-rose-700' : 'text-slate-600'}>
                    ({a.impact > 0 ? '+' : ''}{a.impact} pts)
                  </span>
                  <span className="ml-1">{a.reason}</span>
                  {a.matchedText && (
                    <span className="block pl-4 text-[11px] italic text-slate-500">
                      matched: &ldquo;{a.matchedText}&rdquo;
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <p className="pt-2 text-[11px] text-slate-500">
            This score is informational, is not legal advice, and does not predict an employer&rsquo;s decision.
            Official statutes, licensing agencies, court records, relief orders, and current employer duties control.
          </p>
        </div>
      </div>
    </div>
  );
}

function EligibilityStatusBadge({ status }: { status: CompatibilityRating['eligibility']['highestStatus'] }) {
  const styles = {
    likely_disqualified: 'border-rose-200 bg-rose-50 text-rose-800',
    waiver_or_approval_required: 'border-amber-200 bg-amber-50 text-amber-900',
    license_or_agency_review: 'border-amber-200 bg-amber-50 text-amber-900',
    individualized_review: 'border-sky-200 bg-sky-50 text-sky-800',
    no_occupation_specific_bar_found: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[status];
  const labels = {
    likely_disqualified: 'Likely regulated restriction',
    waiver_or_approval_required: 'Approval or waiver path',
    license_or_agency_review: 'Agency verification needed',
    individualized_review: 'Individualized review',
    no_occupation_specific_bar_found: 'No specific bar found',
  }[status];
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles}`}>{labels}</span>;
}

// ─── small helpers ─────────────────────────────────────────────────

function Section({ title, icon, tone, children }: { title: string; icon: React.ReactNode; tone?: 'rose' | 'emerald' | 'amber' | 'slate'; children: React.ReactNode }) {
  const toneClass = {
    rose:    'bg-rose-50/40 border-rose-100',
    emerald: 'bg-emerald-50/40 border-emerald-100',
    amber:   'bg-amber-50/40 border-amber-100',
    slate:   'bg-slate-50/40 border-slate-200',
  }[tone ?? 'slate'];
  return (
    <section className={`rounded-lg border ${toneClass} p-4`}>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
      {items.map((s, i) => <li key={i}>{s}</li>)}
    </ul>
  );
}

function BridgeStepLi({ index, step }: { index: number; step: TrainingBridgeStep }) {
  const kindLabel = {
    certification: 'Certification',
    license: 'License',
    training: 'Training',
    experience: 'Experience',
    application: 'Application',
    document: 'Document',
  }[step.kind];
  return (
    <li className="rounded-md border border-emerald-100 bg-white px-3 py-2">
      <div className="flex items-baseline gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-800">
          {index}
        </span>
        <span className="text-sm font-semibold text-slate-800">{step.title}</span>
        <span className="text-[10px] uppercase tracking-wider text-emerald-700">· {kindLabel}</span>
      </div>
      <p className="mt-1 text-xs text-slate-600">{step.reason}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        {step.estDuration && <span>⏱ {step.estDuration}</span>}
        {step.externalUrl && (
          <a href={step.externalUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 hover:underline">
            Resource ↗
          </a>
        )}
      </div>
    </li>
  );
}

function Component({ keyName, component }: { keyName: string; component: CompatibilityRating['scoreBreakdown'][keyof CompatibilityRating['scoreBreakdown']] }) {
  const pct = component.maxWeight === 0 ? 0 : Math.round((component.weightedScore / component.maxWeight) * 100);
  const barColor = pct >= 75 ? 'bg-emerald-500' : pct >= 45 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-800">{component.label}</span>
        <span className="font-mono text-xs text-slate-600">
          {component.weightedScore} / {component.maxWeight}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-600">{component.explanation}</p>
      {component.signals.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
          {component.signals.map((s, i) => <li key={i}>· {s}</li>)}
        </ul>
      )}
    </div>
  );
}
