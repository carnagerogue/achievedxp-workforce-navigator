'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useSavedJobIds, toggleSaved } from '../lib/personal-store';
import { useToast } from './Toast';

type Variant = 'icon' | 'full';

/**
 * Bookmark toggle. Two visual variants:
 *   icon — compact, for list rows
 *   full — labeled button, for the detail page
 *
 * Honors `stopPropagation` so it can sit inside a clickable card without
 * stealing the card's navigation behavior.
 */
export function SaveJobButton({
  jobId,
  variant = 'icon',
  className = '',
}: {
  jobId: string;
  variant?: Variant;
  className?: string;
}) {
  const ids = useSavedJobIds();
  const saved = ids.includes(jobId);
  const toast = useToast();

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggleSaved(jobId);
    toast.info(nowSaved ? 'Saved for later' : 'Removed from saved');
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handle}
        className={
          'relative z-10 rounded-lg border p-1.5 transition ' +
          (saved
            ? 'border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100'
            : 'border-slate-300 bg-white text-slate-500 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700') +
          ' ' + className
        }
        aria-pressed={saved}
        aria-label={saved ? 'Remove from saved' : 'Save for later'}
        title={saved ? 'Saved' : 'Save for later'}
      >
        {saved
          ? <BookmarkCheck className="h-4 w-4" />
          : <Bookmark    className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      className={
        'inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ' +
        (saved
          ? 'border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100'
          : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700') +
        ' ' + className
      }
      aria-pressed={saved}
    >
      {saved
        ? <><BookmarkCheck className="h-4 w-4" /> Saved</>
        : <><Bookmark     className="h-4 w-4" /> Save</>}
    </button>
  );
}
