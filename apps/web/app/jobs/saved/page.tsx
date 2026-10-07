'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bookmark, Briefcase, CalendarCheck, ChevronDown, History, ShieldAlert, Trophy } from 'lucide-react';
import type { MatchesResponseDto } from '@dxp/shared';
import { PageHeader } from '../../../components/shell/PageHeader';
import { MiniJobList } from '../../../components/MiniJobList';
import { SaveJobButton } from '../../../components/SaveJobButton';
import { AvoidCard } from '../../../components/AvoidCard';
import { ApplicationStatusPicker, statusLabel } from '../../../components/ApplicationStatusPicker';
import { useApplications, useRecentJobIds, useSavedJobIds } from '../../../lib/personal-store';
import { getMatches } from '../../../lib/api';
import { getUserId } from '../../../lib/session';

/**
 * My jobs — the job hunt's paper trail in one place: applications with their
 * status, saved jobs to come back to, and what you looked at recently. Roles
 * the matcher flags as likely blocked sit at the bottom, folded, with the
 * reason for each — transparent without being the first thing you see.
 */
export default function MyJobsPage() {
  const savedIds = useSavedJobIds();
  const recentIds = useRecentJobIds();
  const applications = useApplications();
  const [matches, setMatches] = useState<MatchesResponseDto | null>(null);

  useEffect(() => {
    const id = getUserId();
    if (!id) return;
    getMatches(id, 20).then(setMatches).catch(() => setMatches(null));
  }, []);

  const apps = Object.values(applications).sort((a, b) => b.updatedAt - a.updatedAt);
  const appliedIds = apps.map((a) => a.jobId);
  const interviewing = apps.filter((a) => a.status === 'INTERVIEWING').length;
  const offers = apps.filter((a) => a.status === 'OFFERED' || a.status === 'HIRED').length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Jobs"
        title="My jobs"
        description="Every job you’ve saved or applied to, in one place. Update the status as things move so you always know who to follow up with."
        actions={<Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">Find more jobs <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat Icon={Briefcase} label="Applied" value={apps.length} />
        <Stat Icon={CalendarCheck} label="Interviewing" value={interviewing} />
        <Stat Icon={Trophy} label="Offers & hires" value={offers} />
        <Stat Icon={Bookmark} label="Saved" value={savedIds.length} />
      </dl>

      <Section id="applications" Icon={Briefcase} title="Applications" description="Set a status on any job and it shows up here. Follow up a week after applying if you haven’t heard back.">
        <MiniJobList
          ids={appliedIds}
          limit={40}
          emptyMessage="Nothing tracked yet. When you apply to a job, set its status to “Applied” and it will appear here."
          rightSlot={(job) => {
            const app = applications[job.id];
            if (!app) return null;
            return (
              <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1.5">
                <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800">{statusLabel(app.status)}</span>
                <ApplicationStatusPicker jobId={job.id} />
              </div>
            );
          }}
        />
      </Section>

      <Section id="saved" Icon={Bookmark} title="Saved jobs" description="Jobs you bookmarked to come back to.">
        <MiniJobList ids={savedIds} limit={40} emptyMessage="Tap the bookmark on any job to save it here." rightSlot={(job) => <SaveJobButton jobId={job.id} />} />
      </Section>

      {recentIds.length > 0 && (
        <Section id="recent" Icon={History} title="Recently viewed" description="The last jobs you opened.">
          <MiniJobList ids={recentIds} emptyMessage="No recently viewed jobs." />
        </Section>
      )}

      {matches && matches.avoid.length > 0 && (
        <details className="group rounded-[20px] border border-slate-900/[0.08] bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"><ShieldAlert className="h-5 w-5" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-navy-900">Roles with a likely legal barrier ({matches.counts.avoid.toLocaleString()})</span>
              <span className="block text-sm text-slate-500">We don’t hide them — here is exactly why each one may not work right now, so the choice stays yours.</span>
            </span>
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-5 sm:p-6 md:grid-cols-2">
            {matches.avoid.map((m) => <AvoidCard key={m.jobId + m.reasons.join('|')} item={m} />)}
          </div>
        </details>
      )}
    </div>
  );
}

function Stat({ Icon, label, value }: { Icon: typeof Briefcase; label: string; value: number }) {
  return (
    <div className="rounded-[20px] border border-slate-900/[0.08] bg-white p-4">
      <dt className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon className="h-4 w-4 text-slate-400" aria-hidden="true" /> {label}</dt>
      <dd className="mt-2 text-3xl font-bold tabular-nums leading-none text-navy-900">{value}</dd>
    </div>
  );
}

function Section({ id, Icon, title, description, children }: { id: string; Icon: typeof Briefcase; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32">
      <div className="mb-3 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 ring-1 ring-inset ring-slate-200"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 id={`${id}-title`} className="text-lg font-semibold text-navy-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
