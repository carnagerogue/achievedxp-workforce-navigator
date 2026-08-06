'use client';

import { ListChecks } from 'lucide-react';
import { MyPlan } from '../../components/plan/MyPlan';
import { CalendarExportButton } from '../../components/CalendarExportButton';

/**
 * Top-level home for the person's plan. The workspace itself (steps,
 * readiness, supervision, check-ins, share/import/print) lives in
 * components/plan/MyPlan.tsx — this page gives it a proper front door
 * instead of hiding it behind a tab on the local-help page.
 */
export default function PlanPage() {
  return (
    <div className="animate-fade-in">
      <header className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <ListChecks className="h-3.5 w-3.5" /> Plan &amp; progress
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          My plan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Your working plan — steps, readiness, supervision, and check-ins, all in one place.
          Private to this device.
        </p>
        <div className="mt-4"><CalendarExportButton /></div>
      </header>

      <div className="mt-6">
        <MyPlan />
      </div>
    </div>
  );
}
