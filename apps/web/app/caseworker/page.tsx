'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Plus, Users } from 'lucide-react';
import { CONVICTION_LABELS } from '@dxp/shared';
import { useCaseload, type Participant } from '../../lib/caseworker-store';
import {
  progressPct, overdueTasks, lastActivityAt, needsAttention,
} from '../../lib/caseworker-progress';
import { CommandCenterHeader } from '../../components/caseworker/CommandCenterHeader';
import {
  CaseloadToolbar, type CaseloadSort, type CaseloadFilter,
} from '../../components/caseworker/CaseloadToolbar';
import { ParticipantCard } from '../../components/caseworker/ParticipantCard';
import { NeedsAttentionRail } from '../../components/caseworker/NeedsAttentionRail';
import { PrivacyControls } from '../../components/caseworker/PrivacyControls';

function matchesFilter(p: Participant, f: CaseloadFilter): boolean {
  switch (f) {
    case 'attention': return needsAttention(p);
    case 'incarcerated': return p.contextMode === 'currently_incarcerated' || p.contextMode === 'preparing_for_release';
    case 'active': return p.contextMode !== 'currently_incarcerated' && p.contextMode !== 'preparing_for_release';
    default: return true;
  }
}

function matchesQuery(p: Participant, q: string): boolean {
  if (!q) return true;
  const hay = `${p.name} ${p.careerGoal} ${CONVICTION_LABELS[p.conviction]} ${p.location}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

const SORTERS: Record<CaseloadSort, (a: Participant, b: Participant) => number> = {
  recent: (a, b) => lastActivityAt(b) - lastActivityAt(a),
  overdue: (a, b) => overdueTasks(b).length - overdueTasks(a).length || lastActivityAt(b) - lastActivityAt(a),
  progress: (a, b) => progressPct(a) - progressPct(b),
};

export default function CaseworkerCommandCenter() {
  const caseload = useCaseload();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CaseloadSort>('recent');
  const [filter, setFilter] = useState<CaseloadFilter>('all');

  const visible = useMemo(
    () => caseload.filter((p) => matchesFilter(p, filter) && matchesQuery(p, query)).sort(SORTERS[sort]),
    [caseload, filter, query, sort],
  );

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 p-8 text-white shadow-card sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_350px_at_85%_20%,rgba(245,91,29,0.18),transparent),radial-gradient(700px_350px_at_-10%_120%,rgba(30,166,156,0.25),transparent)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
              <ClipboardList className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200">Staff view · Reentry navigator</p>
              <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Caseload Command Center</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-50/90">
                Your whole caseload at a glance — who needs you today, what&rsquo;s overdue, and where each
                person stands. Open anyone to their workspace: realistic matches, barriers mapped to local
                help, training, the action plan, and live labor-market data, all in one place.
              </p>
            </div>
          </div>
          <Link
            href="/caseworker/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 shadow transition hover:bg-teal-50"
          >
            <Plus className="h-4 w-4" /> New participant
          </Link>
        </div>
      </section>

      {caseload.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mt-6">
            <CommandCenterHeader caseload={caseload} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
            {/* Main: roster */}
            <div>
              <CaseloadToolbar
                query={query} onQuery={setQuery}
                sort={sort} onSort={setSort}
                filter={filter} onFilter={setFilter}
              />
              {visible.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No participants match this view.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {visible.map((p) => <ParticipantCard key={p.id} p={p} />)}
                </div>
              )}
            </div>

            {/* Right rail */}
            <div className="space-y-6">
              <NeedsAttentionRail caseload={caseload} />
            </div>
          </div>

          <div className="mt-6">
            <PrivacyControls />
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
        <Users className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-navy-900">Start your caseload</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Add the first person you&rsquo;re helping. You&rsquo;ll get realistic job matches, barriers mapped to
        local help, training pathways, and a trackable action plan — all saved privately on this device.
      </p>
      <Link
        href="/caseworker/new"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
      >
        <Plus className="h-4 w-4" /> Add first participant
      </Link>
      <div className="mt-6"><PrivacyControls /></div>
    </section>
  );
}
