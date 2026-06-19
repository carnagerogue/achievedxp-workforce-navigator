'use client';

import { StickyNote, History, CheckCircle2, PlusCircle } from 'lucide-react';
import type { Participant } from '../../../lib/caseworker-store';

interface TimelineEvent { at: number; label: string; kind: 'created' | 'completed' }

function buildTimeline(p: Participant): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const t of p.tasks ?? []) {
    events.push({ at: t.createdAt, label: `Added: ${t.title}`, kind: 'created' });
    if (t.completedAt) events.push({ at: t.completedAt, label: `Completed: ${t.title}`, kind: 'completed' });
  }
  return events.sort((a, b) => b.at - a.at).slice(0, 12);
}

function fmt(ts: number): string {
  try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

export function NotesPanel({
  notes, onNotes, participant,
}: {
  notes: string;
  onNotes: (v: string) => void;
  participant: Participant;
}) {
  const timeline = buildTimeline(participant);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
        <StickyNote className="h-4 w-4 text-teal-600" /> Caseworker notes
      </h2>
      <textarea
        value={notes}
        onChange={(e) => onNotes(e.target.value)}
        rows={3}
        placeholder="Stable transportation, finished GED in 2024, prefers day shifts…"
        className="mt-2 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />

      <h3 className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <History className="h-3.5 w-3.5" /> Progress timeline
      </h3>
      {timeline.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">No activity yet.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {timeline.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              {e.kind === 'completed'
                ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
                : <PlusCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />}
              <span className="flex-1 text-slate-600">{e.label}</span>
              <span className="shrink-0 text-slate-400">{fmt(e.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
