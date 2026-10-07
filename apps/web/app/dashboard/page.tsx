'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, Info, Settings2, Sparkles } from 'lucide-react';
import { useNavigatorProfile } from '../../lib/navigator-profile';
import { FocusHero } from '../../components/journey/FocusHero';
import { TodayFocus } from '../../components/TodayFocus';
import { RoadmapStrip, JobSnapshot, HelpCard } from '../../components/home/HomeSections';
import { useCompletedSteps } from '../../lib/reentry-store';
import {
  useChecklist, useCheckins, useConditions, useFees, useSupervisionInfo, usePlanGoals,
} from '../../lib/checklist-store';
import { phaseProgress } from '../../lib/reentry-journey';
import { buildFocusQueue, focusCounts } from '../../lib/focus';
import { useAuthScopeReady } from '../../components/auth/AuthScopeSync';
import { dashboardState } from '../../lib/dashboard-state';

/**
 * HOME — answers one question: "what do I do next?" Everything hangs off the
 * single prioritized focus queue (lib/focus.ts). The next step gets the whole
 * stage; below it sit where you are on the roadmap, the few things coming
 * up, your job search at a glance, and help. Every full list lives in its own
 * section (My plan, Jobs, Learn, Help) instead of stacking up here.
 */
export default function HomePage() {
  const p = useNavigatorProfile();
  const scopeReady = useAuthScopeReady();
  const completedArr = useCompletedSteps();
  const items = useChecklist();
  const checkins = useCheckins();
  const conditions = useConditions();
  const fees = useFees();
  const supervision = useSupervisionInfo();
  const goals = usePlanGoals();

  const [greet, setGreet] = useState('Welcome');
  const [today, setToday] = useState('');
  const [staffDenied, setStaffDenied] = useState(false);
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreet(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
    setToday(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    setStaffDenied(new URLSearchParams(window.location.search).get('staffAccess') === 'denied');
  }, []);

  const completed = new Set(completedArr);
  const phases = phaseProgress(p.journey.inputs, completed);
  const queue = buildFocusQueue({ supervision, conditions, fees, items, checkins, journeyNext: p.journey.next });
  const { overdue, soon } = focusCounts(queue);
  const hero = queue[0] ?? null;
  const upNext = queue.slice(1, 4);

  const state = dashboardState(scopeReady, p.profileHydrated, p.onboardingComplete);
  if (state === 'loading') return <DashboardLoading />;
  if (state === 'onboarding') return <DashboardOnboardingState />;

  const workingToward = (p.futureSelf || goals || '').trim();
  const subline = overdue > 0
    ? `${overdue} ${overdue === 1 ? 'thing needs' : 'things need'} you today — start with the first one below.`
    : soon > 0
    ? `${soon} ${soon === 1 ? 'thing is' : 'things are'} coming up this week. You've got this.`
    : workingToward
    ? null
    : 'Here’s your next step. One at a time is how this works.';

  return (
    <div className="home space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500" suppressHydrationWarning>{today || ' '}</p>
          <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.03em] text-navy-900 sm:text-[40px]">
            {greet}{p.firstName ? `, ${p.firstName}` : ''}.
          </h1>
          {subline ? (
            <p className={'mt-1.5 text-[15px] sm:text-base ' + (overdue > 0 ? 'font-semibold text-rose-700' : 'text-slate-600')}>{subline}</p>
          ) : (
            <p className="mt-1.5 text-[15px] text-slate-600 sm:text-base">
              Working toward: <Link href="/plan#goal" className="font-semibold text-navy-900 underline decoration-teal-300 decoration-2 underline-offset-4 hover:decoration-teal-600">{workingToward}</Link>
            </p>
          )}
        </div>
        <Link href="/onboarding" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-navy-900">
          <Settings2 className="h-4 w-4" aria-hidden="true" /> Edit profile
        </Link>
      </header>

      {staffDenied && (
        <p className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600" role="status">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
          Caseworker tools are for staff accounts. Everything for your own job search is right here.
        </p>
      )}

      <FocusHero entry={hero} journeyDone={p.journey.done} journeyTotal={p.journey.total} phases={phases} completed={completed} />

      <RoadmapStrip phases={phases} activeKey={p.journey.phaseKey} done={p.journey.done} total={p.journey.total} />

      {upNext.length > 0 && <TodayFocus entries={upNext} />}

      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <JobSnapshot />
        <HelpCard />
      </div>

      <p className="pb-2 text-center text-xs text-slate-400">Your plan and progress stay private on this device until you choose to share them.</p>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading your workspace">
      <div className="h-20 w-2/3 rounded-2xl bg-slate-200/70" />
      <div className="h-[22rem] rounded-[24px] bg-slate-200/70" />
      <div className="h-40 rounded-[20px] bg-slate-200/70" />
    </div>
  );
}

function DashboardOnboardingState() {
  return (
    <div className="animate-fade-in py-4 sm:py-10" data-testid="dashboard-onboarding-required">
      <section className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-navy-900 px-6 py-12 text-white shadow-pop sm:px-12 sm:py-16 lg:px-16">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute -bottom-44 -left-24 h-96 w-96 rounded-full bg-sunset-500/15 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-300/70 to-transparent" />
        </div>

        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-200">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Welcome
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            Let&apos;s find your next step.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            Answer a few quick questions — about four minutes — and we&apos;ll build your roadmap, your plan and your job matches from only what you choose to share.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/onboarding" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-300 px-6 py-3 text-sm font-bold text-navy-900 transition hover:-translate-y-0.5 hover:bg-teal-200">
              Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/jobs" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/10">
              <Briefcase className="h-4 w-4" aria-hidden="true" /> Browse jobs first
            </Link>
          </div>
        </div>

        <ol className="mt-12 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
          {[
            ['01', 'Tell us about you', 'Your area, your skills, the work you want. Skip anything.'],
            ['02', 'Get your roadmap', 'Four phases, one clear next step at a time.'],
            ['03', 'Move up', 'Jobs, training and help matched to where you are.'],
          ].map(([number, title, detail]) => (
            <li key={number} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="text-xs font-bold tracking-[0.18em] text-sunset-300">{number}</span>
              <h2 className="mt-3 text-sm font-bold text-white">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
