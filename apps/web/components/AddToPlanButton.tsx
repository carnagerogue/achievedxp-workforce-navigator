'use client';

/**
 * "Add to my plan" — the one-tap bridge from any tool page into the person's
 * plan (checklist-store). Before this existed, six pages were dead ends:
 * you could learn "I qualify for SNAP" and have no way to make it a tracked
 * step. Idempotent by stable id (same id toggles off), and shows live
 * in-plan state via the store subscription.
 */
import Link from 'next/link';
import { ListChecks, Plus, Check } from 'lucide-react';
import { useChecklist, toggleChecklist, type ChecklistItem } from '../lib/checklist-store';

export type PlannableItem = Omit<ChecklistItem, 'status' | 'addedAt'>;

export function AddToPlanButton({ item, compact = false }: { item: PlannableItem; compact?: boolean }) {
  const items = useChecklist();
  const inPlan = items.some((i) => i.id === item.id);

  if (inPlan) {
    return (
      <span className={'inline-flex items-center gap-1.5 font-semibold text-teal-700 ' + (compact ? 'text-[11px]' : 'rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs')}>
        <Check className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} /> In your plan
        <Link href="/plan" className="underline decoration-teal-300 underline-offset-2 hover:text-teal-800">open</Link>
      </span>
    );
  }

  return (
    <button
      onClick={() => toggleChecklist(item)}
      className={'inline-flex items-center gap-1.5 font-semibold transition ' + (compact
        ? 'text-[11px] text-slate-500 hover:text-teal-700'
        : 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-teal-400 hover:text-teal-700')}
      aria-label={`Add "${item.name}" to my plan`}
    >
      {compact ? <Plus className="h-3 w-3" /> : <ListChecks className="h-3.5 w-3.5" />} Add to my plan
    </button>
  );
}
