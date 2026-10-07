'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Bookmark, Briefcase, CalendarCheck, Check, HandCoins, HeartHandshake, LifeBuoy, Phone, SearchCheck,
} from 'lucide-react';
import type { MatchesResponseDto } from '@dxp/shared';
import { getMatches } from '../../lib/api';
import { getUserId } from '../../lib/session';
import { useApplications, useSavedJobIds } from '../../lib/personal-store';
import type { PhaseProgress } from '../../lib/reentry-journey';
import { Skeleton } from '../Skeleton';

const CARD = 'rounded-[20px] border border-slate-900/[0.08] bg-white';

// ───────────────────────── Roadmap strip ─────────────────────────

/** The four phases at a glance — where you are, what is done, what is ahead. */
export function RoadmapStrip({ phases, activeKey, done, total }: {
  phases: PhaseProgress[];
  activeKey: string;
  done: number;
  total: number;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <section aria-labelledby="roadmap-title" className={CARD + ' p-5 sm:p-6'}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="roadmap-title" className="text-base font-semibold text-navy-900">Your roadmap</h2>
          <p className="text-sm text-slate-500">{done} of {total} steps done · {pct}%</p>
        </div>
        <Link href="/plan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800">
          See my full plan <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <ol className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {phases.map(({ phase, done: phaseDone, total: phaseTotal, complete }, index) => {
          const current = phase.key === activeKey && !complete;
          const width = phaseTotal ? Math.round((phaseDone / phaseTotal) * 100) : 0;
          return (
            <li key={phase.key}>
              <Link href={`/plan#phase-${phase.key}`} aria-current={current ? 'step' : undefined}
                className={'group flex h-full flex-col rounded-2xl border p-3.5 transition hover:-translate-y-0.5 sm:p-4 ' +
                  (current ? 'border-navy-900 bg-navy-900 text-white shadow-[0_12px_30px_rgba(29,38,64,.18)]'
                    : complete ? 'border-teal-200 bg-teal-50/60 hover:border-teal-300'
                    : 'border-slate-200 bg-white hover:border-slate-300')}>
                <span className="flex items-center justify-between gap-2">
                  <span className={'text-[11px] font-semibold uppercase tracking-[0.14em] ' + (current ? 'text-teal-200' : complete ? 'text-teal-700' : 'text-slate-400')}>
                    {current ? 'You are here' : `Phase ${index + 1}`}
                  </span>
                  {complete && <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white"><Check className="h-3 w-3" aria-hidden="true" /></span>}
                </span>
                <span className={'mt-2 text-sm font-semibold leading-snug ' + (current ? 'text-white' : 'text-navy-900')}>{phase.title}</span>
                <span className={'mt-auto pt-4'}>
                  <span className={'block h-1.5 overflow-hidden rounded-full ' + (current ? 'bg-white/15' : 'bg-slate-100')}>
                    <span className={'block h-full rounded-full ' + (current ? 'bg-teal-300' : 'bg-teal-500')} style={{ width: `${width}%` }} />
                  </span>
                  <span className={'mt-1.5 block text-xs ' + (current ? 'text-slate-300' : 'text-slate-500')}>{phaseDone} of {phaseTotal} steps</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ───────────────────────── Job search snapshot ─────────────────────────

/**
 * Where the job search stands, in one card: what you've saved and applied
 * to, and the three strongest matches right now. The full lists live in Jobs.
 */
export function JobSnapshot() {
  const savedIds = useSavedJobIds();
  const applications = useApplications();
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [matches, setMatches] = useState<MatchesResponseDto | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const id = getUserId();
    setUserId(id);
    setChecked(true);
    if (!id) return;
    getMatches(id, 3).then(setMatches).catch(() => setFailed(true));
  }, []);

  const apps = Object.values(applications);
  const applied = apps.length;
  const interviewing = apps.filter((a) => a.status === 'INTERVIEWING' || a.status === 'OFFERED').length;
  const top = matches?.topMatches.slice(0, 3) ?? [];

  return (
    <section aria-labelledby="jobs-snapshot-title" className={CARD + ' flex flex-col p-5 sm:p-6'}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="jobs-snapshot-title" className="text-base font-semibold text-navy-900">Your job search</h2>
          <p className="text-sm text-slate-500">Track it here, apply in a few taps.</p>
        </div>
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800">
          Find jobs <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <Stat href="/jobs/saved#saved" Icon={Bookmark} value={savedIds.length} label="Saved" />
        <Stat href="/jobs/saved#applications" Icon={Briefcase} value={applied} label="Applied" />
        <Stat href="/jobs/saved#applications" Icon={CalendarCheck} value={interviewing} label="Interviews" />
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Best matches for you</p>
        {!checked || (userId && !matches && !failed) ? (
          <ul className="mt-3 space-y-2.5" aria-busy="true" aria-label="Loading your matches">
            {[0, 1, 2].map((i) => <li key={i}><Skeleton className="h-14 w-full rounded-xl" /></li>)}
          </ul>
        ) : top.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {top.map((m) => (
              <li key={m.jobId}>
                <Link href={`/jobs/${m.jobId}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy-900">{m.job.title}</span>
                    <span className="block truncate text-xs text-slate-500">{[m.job.company, [m.job.locationCity, m.job.locationRegion].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800 ring-1 ring-inset ring-teal-200">{Math.round(m.score)}% fit</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Link href="/jobs" className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-4 transition hover:border-teal-400">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><SearchCheck className="h-5 w-5" aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-navy-900">See jobs matched to you</span>
              <span className="block text-xs text-slate-500">Real openings near you, with the reasons each one fits.</span>
            </span>
          </Link>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">See all matches</Link>
        <Link href="/jobs/saved" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-navy-900">My jobs</Link>
      </div>
    </section>
  );
}

function Stat({ href, Icon, value, label }: { href: string; Icon: typeof Bookmark; value: number; label: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 p-3 transition hover:border-teal-300 hover:bg-teal-50/40">
      <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
      <span className="mt-2 block text-2xl font-bold tabular-nums leading-none text-navy-900">{value}</span>
      <span className="mt-1 block text-xs font-medium text-slate-500">{label}</span>
    </Link>
  );
}

// ───────────────────────── Help card ─────────────────────────

/** Human help is always one tap away, without taking over the page. */
export function HelpCard() {
  return (
    <section aria-labelledby="help-title" className={CARD + ' flex flex-col p-5 sm:p-6'}>
      <h2 id="help-title" className="text-base font-semibold text-navy-900">Help when you need it</h2>
      <p className="text-sm text-slate-500">Free, private, and no account needed.</p>
      <ul className="mt-5 space-y-2.5">
        <HelpRow href="tel:211" Icon={Phone} title="Call 211" sub="Food, housing, bills and local programs" />
        <HelpRow href="tel:988" Icon={HeartHandshake} title="Call or text 988" sub="Talk to someone, any time" />
        <HelpRow href="/benefits" Icon={HandCoins} title="Benefits checkup" sub="See what you qualify for in 1 minute" />
        <HelpRow href="/resources" Icon={LifeBuoy} title="All free help & hotlines" sub="Health, legal, family, veterans and more" />
      </ul>
    </section>
  );
}

function HelpRow({ href, Icon, title, sub }: { href: string; Icon: typeof Phone; title: string; sub: string }) {
  const inner = (
    <>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-teal-700 ring-1 ring-inset ring-slate-200"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-navy-900">{title}</span>
        <span className="block text-xs text-slate-500">{sub}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600" aria-hidden="true" />
    </>
  );
  const cls = 'group flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-teal-300';
  return <li>{href.startsWith('/') ? <Link href={href} className={cls}>{inner}</Link> : <a href={href} className={cls}>{inner}</a>}</li>;
}
