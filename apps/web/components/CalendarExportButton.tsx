'use client';

/**
 * "Put my dates on my calendar" — downloads an .ics with every dated
 * obligation (report date, conditions, fees, plan steps), each with built-in
 * night-before and morning-of alarms. The no-server version of SMS reminders:
 * works on any phone, nothing to sign up for, nothing leaves the device.
 */
import { CalendarPlus } from 'lucide-react';
import { useChecklist, useConditions, useFees, useSupervisionInfo } from '../lib/checklist-store';
import { reminderEvents, downloadIcs } from '../lib/ics';

export function CalendarExportButton({ className = '' }: { className?: string }) {
  const supervision = useSupervisionInfo();
  const conditions = useConditions();
  const fees = useFees();
  const items = useChecklist();

  const events = reminderEvents({ supervision, conditions, fees, items });
  if (events.length === 0) return null;

  return (
    <button
      onClick={() => downloadIcs(events)}
      className={'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-700 ' + className}
      title="Download a calendar file with alarms for every date in your plan"
    >
      <CalendarPlus className="h-3.5 w-3.5" />
      Put {events.length === 1 ? 'this date' : `these ${events.length} dates`} on my calendar
    </button>
  );
}
