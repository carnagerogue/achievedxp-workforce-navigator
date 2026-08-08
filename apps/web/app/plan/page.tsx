'use client';

import { ListChecks, LockKeyhole } from 'lucide-react';
import { MyPlan } from '../../components/plan/MyPlan';
import { CalendarExportButton } from '../../components/CalendarExportButton';
import { JourneyRail } from '../../components/JourneyRail';

/**
 * Top-level home for the person's plan. The workspace itself (steps,
 * readiness, supervision, check-ins, share/import/print) lives in
 * components/plan/MyPlan.tsx — this page gives it a proper front door
 * instead of hiding it behind a tab on the local-help page.
 */
export default function PlanPage() {
  return (
    <div className="constellation-workspace animate-fade-in">
      <JourneyRail active="plan" />
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-navy-900/15 py-5 sm:py-6">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sunset-600">
            <ListChecks className="h-3.5 w-3.5" /> Plan &amp; progress
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-[-.035em] text-navy-900 sm:text-4xl">My plan</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Turn what matters now into a clear, manageable next step.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><LockKeyhole className="h-3.5 w-3.5" /> Private on this device</span>
          <CalendarExportButton />
        </div>
      </header>

      <div className="mt-5">
        <MyPlan />
      </div>
    </div>
  );
}
