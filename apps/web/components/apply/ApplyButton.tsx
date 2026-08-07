'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import type { JobDto } from '@dxp/shared';
import { ApplyDialog } from './ApplyDialog';

/** Primary "Apply" entry point — opens the apply dialog (kit + real handoff). */
export function ApplyButton({ job, className = '' }: { job: JobDto; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className || 'group inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 active:scale-[0.98]'}
      >
        <Send className="h-4 w-4" /> Apply
      </button>
      {open && <ApplyDialog job={job} onClose={() => setOpen(false)} />}
    </>
  );
}
