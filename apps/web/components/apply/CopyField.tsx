'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/** A labeled value with a one-tap copy button — the core of "paste it fast". */
export function CopyField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard blocked — the value is still visible to select */ }
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={'mt-0.5 text-sm text-slate-800 ' + (multiline ? 'whitespace-pre-wrap leading-relaxed' : 'truncate')}>{value}</p>
        </div>
        <button
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-teal-400 hover:text-teal-700"
          aria-label={`Copy ${label}`}
        >
          {copied ? <><Check className="h-3 w-3 text-teal-600" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
    </div>
  );
}
