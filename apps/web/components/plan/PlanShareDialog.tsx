'use client';

import { useState } from 'react';
import { X, Download, Copy, Check, Share2 } from 'lucide-react';
import { encodePlan, downloadPlan, planFilename, type PortablePlan } from '../../lib/plan-transfer';

/**
 * Share a plan as a downloadable file or a copyable code — the same dialog the
 * individual uses to hand a plan to a caseworker and the caseworker uses to
 * hand one back to a participant.
 */
export function PlanShareDialog({
  plan, audience, onClose,
}: {
  plan: PortablePlan;
  audience: 'caseworker' | 'participant';
  onClose: () => void;
}) {
  const code = encodePlan(plan);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { /* clipboard blocked — user can select the textarea */ }
  };

  const blurb = audience === 'caseworker'
    ? 'Send this to your caseworker or probation officer. They can load it to see your whole plan and progress.'
    : 'Give this to the participant. They can load it in “Local help → My Plan” to track it on their own device.';

  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Share2 className="h-4 w-4" /></span>
          <div>
            <h2 className="text-base font-bold text-navy-900">Share this plan</h2>
            <p className="text-xs text-slate-500">{plan.person.name || 'Unnamed'} · {plan.items.length} item{plan.items.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
      </div>

      <p className="mt-3 text-sm text-slate-600">{blurb}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => downloadPlan(plan, planFilename(plan.person.name))}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Download className="h-4 w-4" /> Download file
        </button>
        <button
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700"
        >
          {copied ? <><Check className="h-4 w-4 text-teal-600" /> Copied</> : <><Copy className="h-4 w-4" /> Copy code</>}
        </button>
      </div>

      <p className="mt-4 mb-1 text-xs font-medium text-slate-500">Or copy the code manually:</p>
      <textarea
        readOnly value={code} rows={3} onFocus={(e) => e.currentTarget.select()}
        className="block w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-600 focus:border-teal-500 focus:outline-none"
      />
    </Backdrop>
  );
}

export function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 pt-24 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-card-hover animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
