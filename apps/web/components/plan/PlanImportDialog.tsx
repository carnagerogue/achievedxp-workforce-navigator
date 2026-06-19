'use client';

import { useRef, useState } from 'react';
import { X, Upload, ClipboardPaste, FileDown, AlertTriangle } from 'lucide-react';
import { parsePlanText, type PortablePlan } from '../../lib/plan-transfer';
import { Backdrop } from './PlanShareDialog';

/**
 * Import a plan from a pasted code or an uploaded file. Used by the individual
 * ("a caseworker gave me a plan") and the caseworker command center ("import a
 * participant-built plan"). When allowMerge is on the caller gets a
 * Replace/Merge choice; otherwise a single Import.
 */
export function PlanImportDialog({
  title, hint, allowMerge = true, onImport, onClose,
}: {
  title: string;
  hint: string;
  allowMerge?: boolean;
  onImport: (plan: PortablePlan, mode: 'replace' | 'merge') => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [plan, setPlan] = useState<PortablePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tryParse = (raw: string) => {
    setText(raw);
    if (!raw.trim()) { setPlan(null); setError(null); return; }
    try { setPlan(parsePlanText(raw)); setError(null); }
    catch (e) { setPlan(null); setError(e instanceof Error ? e.message : 'Could not read that.'); }
  };

  const onFile = async (f: File) => {
    const content = await f.text();
    tryParse(content);
  };

  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><FileDown className="h-4 w-4" /></span>
          <h2 className="text-base font-bold text-navy-900">{title}</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
      </div>

      <p className="mt-3 text-sm text-slate-600">{hint}</p>

      <button
        onClick={() => fileRef.current?.click()}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700"
      >
        <Upload className="h-4 w-4" /> Upload plan file
      </button>
      <input
        ref={fileRef} type="file" accept="application/json,.json,.txt" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      <p className="mb-1 mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><ClipboardPaste className="h-3.5 w-3.5" /> Or paste a code:</p>
      <textarea
        value={text}
        onChange={(e) => tryParse(e.target.value)}
        rows={3}
        placeholder="Paste the plan code here…"
        className="block w-full resize-none rounded-lg border border-slate-300 px-3 py-2 font-mono text-[11px] text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />

      {error && (
        <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-rose-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}</p>
      )}

      {plan && (
        <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3">
          <p className="text-sm font-semibold text-navy-900">{plan.person.name || 'Unnamed'}</p>
          <p className="text-xs text-slate-600">{plan.items.length} item{plan.items.length === 1 ? '' : 's'}{plan.readinessScore != null ? ` · ${plan.readinessScore}% ready` : ''}{plan.person.goals ? ` · goal: ${plan.person.goals}` : ''}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allowMerge ? (
              <>
                <button onClick={() => onImport(plan, 'merge')} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">Add to my plan</button>
                <button onClick={() => onImport(plan, 'replace')} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-700">Replace my plan</button>
              </>
            ) : (
              <button onClick={() => onImport(plan, 'replace')} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">Import as participant</button>
            )}
          </div>
        </div>
      )}
    </Backdrop>
  );
}
