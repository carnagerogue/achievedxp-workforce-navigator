'use client';

import { ListChecks } from 'lucide-react';
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
      <header className="border-y border-navy-900/20 bg-transparent py-8 sm:py-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sunset-600">
          <ListChecks className="h-3.5 w-3.5" /> Plan &amp; progress
        </p>
        <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[.85] tracking-[-.04em] text-navy-900 sm:text-7xl">
          My plan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Your working plan — steps, readiness, supervision, and check-ins, all in one place.
          Saved only in this browser unless you export or share it.
        </p>
        <div className="mt-4"><CalendarExportButton /></div>
      </header>

      <div className="mt-6">
        <MyPlan />
      </div>
    </div>
  );
}
