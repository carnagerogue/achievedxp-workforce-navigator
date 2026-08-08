'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, ExternalLink, ListChecks, ArrowRight } from 'lucide-react';
import type { JobDto } from '@dxp/shared';
import { useApplyKit, kitCompleteness } from '../../lib/apply-kit';
import { setApplicationStatus } from '../../lib/personal-store';
import { CopyField } from './CopyField';

const SHIFT_LABEL: Record<string, string> = {
  days: 'Days', nights: 'Nights', weekends: 'Weekends', overnight: 'Overnight', any: 'Any shift',
};

/**
 * Apply flow. We never submit on the user's behalf (that would break the
 * employer's / board's terms) — instead we open the REAL posting and put the
 * reusable Apply Kit right beside it, one tap to copy each answer, and record
 * the application so it lands in the tracker. "Apply once" as a fast, honest
 * handoff rather than a bot.
 */
export function ApplyDialog({ job, onClose }: { job: JobDto; onClose: () => void }) {
  const kit = useApplyKit();
  const complete = kitCompleteness(kit);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const openEmployer = () => {
    setApplicationStatus(job.id, 'APPLIED');
    window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Apply to ${job.title}`}>
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" aria-hidden="true" onMouseDown={onClose} />
      <div className="animate-slide-up relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-pop sm:rounded-3xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-900/[0.06] bg-white/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">Apply</p>
            <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">{job.title}</h2>
            <p className="truncate text-sm text-slate-500">{job.company}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-900/[0.05] hover:text-slate-700" aria-label={`Close application dialog for ${job.title}`}><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-5">
          <button onClick={openEmployer} className="group flex w-full items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-teal-700 active:scale-[0.99]">
            Open the application <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="text-center text-xs text-slate-400">Opens the employer&apos;s form in a new tab and marks this as applied. Paste your answers from below.</p>

          {complete < 60 && (
            <Link href="/apply-kit" className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/50 p-3.5 transition hover:border-teal-400">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white"><ListChecks className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">Fill your Apply Kit once — reuse it everywhere</span>
                <span className="block text-xs text-slate-500">Your answers, ready to paste into every application. {complete}% done.</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-teal-700" />
            </Link>
          )}

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Your answers — tap to copy</p>
            <CopyField label="Full name" value={kit.fullName} />
            <CopyField label="Phone" value={kit.phone} />
            <CopyField label="Email" value={kit.email} />
            <CopyField label="City, state" value={kit.cityState} />
            <CopyField label="Why hire me" value={kit.pitch} multiline />
            <CopyField label="Earliest start date" value={kit.earliestStart} />
            {kit.shifts.length > 0 && <CopyField label="Shifts I can work" value={kit.shifts.map((s) => SHIFT_LABEL[s]).join(', ')} />}
            {kit.hasTransportation !== null && <CopyField label="Reliable transportation" value={kit.hasTransportation ? 'Yes' : 'Working on it'} />}
            {kit.backgroundStatement && <CopyField label="If asked about my record" value={kit.backgroundStatement} multiline />}
            {kit.references.map((r) => (
              <CopyField key={r.id} label={`Reference — ${r.relationship || 'contact'}`} value={[r.name, r.phone].filter(Boolean).join(' · ')} />
            ))}
            {kit.answers.map((a) => (
              <CopyField key={a.id} label={a.question} value={a.answer} multiline />
            ))}
          </div>

          {complete === 0 && (
            <p className="text-center text-xs text-slate-400">
              Nothing saved yet. <Link href="/apply-kit" className="font-semibold text-teal-700 hover:underline">Build your Apply Kit</Link> so the next one takes seconds.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
