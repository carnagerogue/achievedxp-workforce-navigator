'use client';

import { Lock, ShieldCheck, Trash2 } from 'lucide-react';
import {
  useCaseload, usePersistEnabled, setPersistEnabled, clearCaseload,
} from '../../lib/caseworker-store';

/**
 * Device-storage / privacy controls — session-only toggle + clear caseload.
 * Shared by the command center and the workspace so the shared-machine
 * affordance is always one click away.
 */
export function PrivacyControls({ onClear }: { onClear?: () => void }) {
  const caseload = useCaseload();
  const persistEnabled = usePersistEnabled();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
      <p className="inline-flex items-start gap-1.5 text-xs text-slate-600">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>
          {persistEnabled
            ? 'Participant data is stored only in this browser on this device — it never leaves your computer. Clear it before stepping away from a shared machine.'
            : 'Session-only: nothing is saved to this device. Your caseload disappears when you close this tab.'}
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setPersistEnabled(!persistEnabled)}
          className={
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ' +
            (persistEnabled
              ? 'border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700'
              : 'border-teal-600 bg-teal-50 text-teal-700')
          }
        >
          <ShieldCheck className="h-3.5 w-3.5" /> {persistEnabled ? 'Switch to session-only' : 'Session-only is on'}
        </button>
        {caseload.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Permanently clear all ${caseload.length} participant(s) from this device? This cannot be undone.`)) {
                clearCaseload();
                onClear?.();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear caseload
          </button>
        )}
      </div>
    </div>
  );
}
