'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Copy, Check, ArrowLeft, Info } from 'lucide-react';
import {
  generateAllVersions,
  BACKGROUND_EXPLANATION_DISCLAIMER,
  type BackgroundExplanationVersion,
  type ConvictionType,
  CONVICTION_LABELS,
  CONVICTION_TYPE_ORDER,
} from '@dxp/shared';

/**
 * "Prepare Background Explanation" tool — generates four version drafts
 * the user can adapt for applications and interviews.
 *
 * Tone is fixed by templates in @dxp/shared/background-explanation.ts —
 * no AI inference. The user fills in a few signals (time elapsed,
 * supervision, achievements) and gets four ready-to-edit drafts.
 */
const VERSION_TABS: { value: BackgroundExplanationVersion; label: string; helper: string }[] = [
  { value: 'short_application',  label: 'Short application',  helper: '~3 sentences for an application form field.' },
  { value: 'interview',          label: 'Interview',           helper: '4–6 sentences for in-person or phone interviews.' },
  { value: 'caseworker_reviewed',label: 'Caseworker version',  helper: 'Third-person framing for a caseworker to edit and submit.' },
  { value: 'very_brief',         label: 'Very brief',          helper: 'A single sentence for tight character limits.' },
];

export default function BackgroundStatementPage() {
  const [conviction, setConviction] = useState<ConvictionType | ''>('');
  const [yearsSinceRelease, setYearsSinceRelease] = useState<number | ''>('');
  const [supervision, setSupervision] = useState<'none' | 'parole' | 'probation' | 'pretrial'>('none');
  const [expunged, setExpunged] = useState(false);
  const [achInput, setAchInput] = useState('');
  const [activeTab, setActiveTab] = useState<BackgroundExplanationVersion>('short_application');
  const [copied, setCopied] = useState<BackgroundExplanationVersion | null>(null);

  const achievements = useMemo(
    () => achInput.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 4),
    [achInput],
  );

  const versions = useMemo(
    () => generateAllVersions({
      convictionType: conviction || undefined,
      yearsSinceRelease: yearsSinceRelease === '' ? null : Number(yearsSinceRelease),
      supervisionStatus: supervision,
      expungedOrSealed: expunged,
      achievements,
    }),
    [conviction, yearsSinceRelease, supervision, expunged, achievements],
  );

  const active = versions.find((v) => v.version === activeTab) ?? versions[0];

  const handleCopy = async () => {
    if (!active) return;
    await navigator.clipboard.writeText(active.text);
    setCopied(active.version);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <Link href="/jobs" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-teal-700">
          <ArrowLeft className="h-3 w-3" /> Back to jobs
        </Link>
        <div className="mt-3 flex items-start gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <FileText className="h-7 w-7" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">Application support</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">Prepare Background Explanation</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Generate strengths-based draft statements you can adapt for applications and
              interviews. Templates are deterministic — no AI is generating text on your behalf.
            </p>
          </div>
        </div>
      </section>

      {/* Form + output side-by-side */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold text-navy-900">Your inputs</h2>
          <p className="mt-1 text-xs text-slate-600">
            All inputs are optional. The generator fills sensible defaults if you skip fields.
          </p>

          <div className="mt-4 space-y-4">
            <Field label="Conviction type">
              <select
                value={conviction}
                onChange={(e) => setConviction(e.target.value as ConvictionType | '')}
                className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">— not specified —</option>
                {CONVICTION_TYPE_ORDER.map((c) => (
                  <option key={c} value={c}>{CONVICTION_LABELS[c]}</option>
                ))}
              </select>
            </Field>

            <Field label="Years since release (or conviction)">
              <input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={yearsSinceRelease}
                onChange={(e) => setYearsSinceRelease(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 4"
                className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </Field>

            <Field label="Supervision status">
              <select
                value={supervision}
                onChange={(e) => setSupervision(e.target.value as typeof supervision)}
                className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="none">None</option>
                <option value="parole">Parole</option>
                <option value="probation">Probation</option>
                <option value="pretrial">Pre-trial</option>
              </select>
            </Field>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={expunged}
                onChange={(e) => setExpunged(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Conviction is expunged or sealed
            </label>

            <Field label="Achievements since (optional, comma-separated)">
              <textarea
                rows={3}
                value={achInput}
                onChange={(e) => setAchInput(e.target.value)}
                placeholder="e.g. completed forklift certification, 14 months stable employment, finished GED"
                className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">Up to 3 will be used in the draft.</p>
            </Field>
          </div>
        </section>

        {/* Output */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold text-navy-900">Drafts</h2>

          {/* Tabs */}
          <div className="mt-3 flex flex-wrap gap-1 border-b border-slate-200">
            {VERSION_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === t.value
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
                <span className="ml-1 text-[10px] text-slate-400">({(versions.find((v) => v.version === t.value)?.length ?? 0)} ch)</span>
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs italic text-slate-500">{VERSION_TABS.find((t) => t.value === activeTab)?.helper}</p>

          {/* Text */}
          {active && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-relaxed text-slate-800">{active.text}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{active.length} characters</span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-teal-400 hover:text-teal-700"
                >
                  {copied === active.version ? (
                    <><Check className="h-3 w-3 text-emerald-600" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3" /> Copy</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{BACKGROUND_EXPLANATION_DISCLAIMER}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
