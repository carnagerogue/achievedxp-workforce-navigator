'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Briefcase, CalendarCheck, Award, CheckCircle2, XCircle, Undo2, CircleOff } from 'lucide-react';
import type { ApplicationStatus } from '../lib/personal-store';
import { getApplication, setApplicationStatus, useApplications } from '../lib/personal-store';
import { useToast } from './Toast';

interface Option {
  value: ApplicationStatus | null;
  label: string;
  Icon: typeof Check;
  cls: string;
}

const OPTIONS: Option[] = [
  { value: null,           label: 'Not tracked',  Icon: CircleOff,   cls: 'text-slate-500'   },
  { value: 'APPLIED',      label: 'Applied',      Icon: Briefcase,   cls: 'text-teal-700'    },
  { value: 'INTERVIEWING', label: 'Interviewing', Icon: CalendarCheck, cls: 'text-teal-700'  },
  { value: 'OFFERED',      label: 'Offered',      Icon: Award,       cls: 'text-sunset-700'  },
  { value: 'HIRED',        label: 'Hired',        Icon: CheckCircle2,cls: 'text-teal-700'    },
  { value: 'REJECTED',     label: 'Rejected',     Icon: XCircle,     cls: 'text-rose-700'    },
  { value: 'WITHDREW',     label: 'Withdrew',     Icon: Undo2,       cls: 'text-slate-500'   },
];

export function statusLabel(status: ApplicationStatus): string {
  return OPTIONS.find((o) => o.value === status)?.label ?? status;
}

/**
 * Dropdown picker bound to the localStorage application store. Rendered
 * as a compact button that expands into a menu — chosen over a `<select>`
 * so we can show icons and color-code each option.
 */
export function ApplicationStatusPicker({ jobId }: { jobId: string }) {
  useApplications();                       // subscribe so we re-render on changes
  const current = getApplication(jobId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const currentOption = OPTIONS.find((o) => o.value === (current?.status ?? null)) ?? OPTIONS[0];
  const CurrentIcon = currentOption.Icon;

  const pick = (opt: Option) => {
    setApplicationStatus(jobId, opt.value);
    setOpen(false);
    if (opt.value !== null) toast.success(`Marked as ${opt.label.toLowerCase()}`);
    else                    toast.info('Application tracking cleared');
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className={
          'relative z-10 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ' +
          (current
            ? 'border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100'
            : 'border-slate-300 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700')
        }
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <CurrentIcon className={`h-4 w-4 ${current ? currentOption.cls : 'text-slate-500'}`} />
        {current ? currentOption.label : 'Track application'}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover animate-slide-up"
        >
          {OPTIONS.map((opt) => {
            const active = (current?.status ?? null) === opt.value;
            return (
              <li key={opt.label}>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); pick(opt); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  role="option"
                  aria-selected={active}
                >
                  <opt.Icon className={`h-4 w-4 ${opt.cls}`} />
                  <span className={active ? 'font-semibold text-navy-900' : 'text-slate-700'}>{opt.label}</span>
                  {active && <Check className="ml-auto h-4 w-4 text-teal-600" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
