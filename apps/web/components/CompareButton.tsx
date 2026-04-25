'use client';

import { GitCompare, Check } from 'lucide-react';
import { useCompareIds, toggleCompare } from '../lib/personal-store';
import { useToast } from './Toast';

/**
 * Small toggle that adds/removes a job from the comparison set.
 * Capped at 3 by the store; we surface that limit via a toast.
 */
export function CompareButton({ jobId, className = '' }: { jobId: string; className?: string }) {
  const ids = useCompareIds();
  const isIn = ids.includes(jobId);
  const toast = useToast();

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = toggleCompare(jobId);
    if (r.full) {
      toast.info('Compare list full', 'You can compare up to 3 jobs. Remove one first.');
      return;
    }
    toast.info(r.isIn ? 'Added to compare' : 'Removed from compare');
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={
        'relative z-10 rounded-lg border p-1.5 transition ' +
        (isIn
          ? 'border-sunset-300 bg-sunset-50 text-sunset-700 hover:bg-sunset-100'
          : 'border-slate-300 bg-white text-slate-500 hover:border-sunset-300 hover:bg-sunset-50 hover:text-sunset-700') +
        ' ' + className
      }
      aria-pressed={isIn}
      aria-label={isIn ? 'Remove from compare' : 'Add to compare'}
      title={isIn ? 'In compare set' : 'Compare this job'}
    >
      {isIn ? <Check className="h-4 w-4" /> : <GitCompare className="h-4 w-4" />}
    </button>
  );
}
