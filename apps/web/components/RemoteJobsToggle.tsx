'use client';

import { Radio } from 'lucide-react';

interface RemoteJobsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  compact?: boolean;
}

/**
 * A single, explicit preference control used in onboarding and job search.
 * This is intentionally separate from the "Remote only" search filter:
 * checked includes remote roles alongside local ones; unchecked removes them.
 */
export function RemoteJobsToggle({
  checked,
  onChange,
  className = '',
  compact = false,
}: RemoteJobsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Include remote jobs"
      onClick={() => onChange(!checked)}
      className={`group flex items-center gap-3 rounded-xl border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
        checked
          ? 'border-teal-200 bg-teal-50/80 hover:bg-teal-50'
          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
      } ${compact ? 'px-3 py-2' : 'w-full p-4'} ${className}`}
    >
      <span className={`inline-flex shrink-0 items-center justify-center rounded-full ${
        checked ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-500'
      } ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
        <Radio className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-navy-900">Include remote jobs</span>
        <span className={`block text-xs leading-relaxed ${checked ? 'text-teal-800/75' : 'text-slate-500'}`}>
          {checked ? 'On · Local and remote opportunities' : 'Off · In-person opportunities only'}
        </span>
      </span>

      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-teal-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`} />
      </span>
    </button>
  );
}
