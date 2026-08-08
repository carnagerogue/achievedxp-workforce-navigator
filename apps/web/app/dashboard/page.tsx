'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Settings2, TrendingUp, AlertTriangle, Trophy, RefreshCw, Bookmark, ClipboardList, History,
  Brain, ArrowRight, Compass, Gauge, ListChecks, ShieldCheck, ShieldAlert,
  Briefcase, Users, Sparkles, SearchCheck, CalendarClock,
} from 'lucide-react';
import type { MatchesResponseDto } from '@dxp/shared';
import { getMatches, getAssessmentResult, type AssessmentResultDto } from '../../lib/api';
import { getUserId, clearUserId } from '../../lib/session';
import { useNavigatorProfile, type NavigatorProfile } from '../../lib/navigator-profile';
import { JobCard } from '../../components/JobCard';
import { AvoidCard } from '../../components/AvoidCard';
import { Section } from '../../components/Section';
import { JobCardSkeleton } from '../../components/Skeleton';
import { MiniJobList } from '../../components/MiniJobList';
import { InsightsPanel } from '../../components/InsightsPanel';
import { SaveJobButton } from '../../components/SaveJobButton';
import { TodayFocus } from '../../components/TodayFocus';
import { JourneyRail } from '../../components/JourneyRail';
import { ToolsGrid } from '../../components/ToolsGrid';
import { FocusHero } from '../../components/journey/FocusHero';
import {
  CompassSection, CornerSection, FutureSelfSection, EvidencePanel,
} from '../../components/journey/CompassSections';
import { ApplicationStatusPicker, statusLabel } from '../../components/ApplicationStatusPicker';
import { ProfileAvatar } from '../../components/auth/ProfileAvatar';
import { ProgressRing } from '../../components/common/ProgressRing';
import { useSavedJobIds, useRecentJobIds, useApplications } from '../../lib/personal-store';
import { useCompletedSteps, useFutureSelf } from '../../lib/reentry-store';
import { useContacts } from '../../lib/support-network';
import {
  useChecklist, useCheckins, useConditions, useFees, useSupervisionInfo,
} from '../../lib/checklist-store';
import { phaseProgress } from '../../lib/reentry-journey';
import { buildFocusQueue, focusCounts } from '../../lib/focus';
import { useAuthScopeReady } from '../../components/auth/AuthScopeSync';
import { dashboardState } from '../../lib/dashboard-state';

/**
 * HOME — the one guided surface after onboarding. Everything hangs off a single
 * prioritized focus queue (lib/focus.ts): the hero shows the one thing to
 * do now, "staying on track" shows what's behind it, and the compass,
 * plan, matches, and support sections follow in journey order.
 */
export default function HomePage() {
  const p = useNavigatorProfile();
  const scopeReady = useAuthScopeReady();
  const completedArr = useCompletedSteps();
  const contacts = useContacts();
  const futureSelf = useFutureSelf();
  const items = useChecklist();
  const checkins = useCheckins();
  const conditions = useConditions();
  const fees = useFees();
  const supervision = useSupervisionInfo();

  const [greet, setGreet] = useState('Welcome');
  useEffect(() => {
    const h = new Date().getHours();
    setGreet(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  }, []);

  const completed = new Set(completedArr);
  const inputs = p.journey.inputs;
  const progress = phaseProgress(inputs, completed);
  const activeKey = p.journey.phaseKey;
  const overall = p.journey;
  const critical = p.inCriticalWindow;
  const journeyNext = p.journey.next;

  const queue = buildFocusQueue({ supervision, conditions, fees, items, checkins, journeyNext });
  const { overdue, soon } = focusCounts(queue);
  const hero = queue[0] ?? null;
  const rest = queue.slice(1);

  const state = dashboardState(scopeReady, p.profileHydrated, p.onboardingComplete);
  if (state === 'loading') return <DashboardLoading />;
  if (state === 'onboarding') return <DashboardOnboardingState />;

  const fresh = !p.hasAnyData;
  const heroTone = overdue > 0 ? 'from-rose-50 to-white' : soon > 0 ? 'from-amber-50 to-white' : 'from-teal-50 to-white';

  return (
    <div className="constellation-workspace animate-fade-in space-y-4">
      <JourneyRail />
      {/* ─── Hero: greeting + Steady score ─── */}
      <section className={'overflow-hidden rounded-3xl border border-navy-900/20 bg-gradient-to-br p-6 shadow-card sm:p-8 ' + heroTone}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ProfileAvatar name={p.displayName || 'You'} size={56} />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{greet}{p.firstName ? `, ${p.firstName}` : ''}.</h1>
              {fresh
                ? <p className="mt-0.5 text-sm text-slate-600">You don&apos;t have to figure it all out at once — we&apos;ll go one step at a time.</p>
                : p.futureSelf
                ? <p className="mt-0.5 text-sm text-slate-600">Working toward: <span className="font-medium text-navy-900">{p.futureSelf}</span></p>
                : p.careerGoal
                ? <p className="mt-0.5 text-sm text-slate-600">Goal: <span className="font-medium text-navy-900">{p.careerGoal}</span></p>
                : <p className="mt-0.5 text-sm text-slate-600">Here&apos;s where you stand today.</p>}
            </div>
          </div>
          {!fresh && p.overall.score != null && (
            <div className="text-center">
              <ProgressRing pct={p.overall.score} size={84} stroke={7} />
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{p.overall.band}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {overdue > 0 ? (
            <a href="#today" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-rose-100 px-3.5 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-200">
              <AlertTriangle className="h-3.5 w-3.5" /> {overdue} {overdue === 1 ? 'thing needs' : 'things need'} you now — see below
            </a>
          ) : soon > 0 ? (
            <a href="#today" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200 hover:bg-amber-200">
              <CalendarClock className="h-3.5 w-3.5" /> {soon} {soon === 1 ? 'thing is' : 'things are'} coming up this week
            </a>
          ) : fresh ? (
            <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-200">
              <Compass className="h-3.5 w-3.5" /> Let&apos;s set up your next step
            </span>
          ) : (
            <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-teal-100 px-3.5 py-1.5 text-xs font-bold text-teal-700 ring-1 ring-inset ring-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" /> You&apos;re on track
            </span>
          )}
          {critical && (
            <a href="#compass" className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-teal-700">
              Your first months — we&apos;ve got the order figured out
            </a>
          )}
          <Link href="/onboarding" className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-white">
            <Settings2 className="h-3.5 w-3.5" /> {fresh ? 'Set up job matching' : 'Edit profile'}
          </Link>
        </div>
      </section>

      {/* ─── The one thing to do now ─── */}
      <FocusHero entry={hero} />

      {/* ─── Everything else on the clock ─── */}
      {rest.length > 0 && <div id="today" className="scroll-mt-20"><TodayFocus entries={rest} totals={{ overdue, soon }} /></div>}

      {/* ─── The compass: phases + current steps + context ─── */}
      <CompassSection
        inputs={inputs} completed={completed} critical={critical} activeKey={activeKey}
        progress={progress} overallDone={overall.done} overallTotal={overall.total} overallPct={overall.pct}
      />

      {/* ─── Status tiles — glance + navigate ─── */}
      {!fresh && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">How you&apos;re doing</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <StatusTile href="#compass" Icon={Compass} label="Navigator guide" ring={p.journey.pct} state={p.journey.phaseTitle} tone="ok" />
            {p.readiness.engaged ? (
              <StatusTile href="/plan" Icon={Gauge} label="Readiness" ring={p.readiness.score} state={p.readiness.band}
                tone={p.readiness.score >= 65 ? 'ok' : 'attention'} />
            ) : (
              <StatusTile href="/plan" Icon={Gauge} label="Readiness" state="Set up" tone="setup" />
            )}
            <StatusTile href="/plan" Icon={ListChecks} label="My plan"
              state={p.plan.total > 0 ? `${p.plan.done}/${p.plan.total} done` : 'Set up'} tone={p.plan.total === 0 ? 'setup' : 'ok'} />
            {p.onSupervision && (
              <StatusTile href="/plan" Icon={p.compliance.tone === 'at_risk' ? ShieldAlert : ShieldCheck} label="Staying on track"
                state={p.compliance.label} tone={p.compliance.tone} />
            )}
            <StatusTile href="/jobs" Icon={Briefcase} label="Job hunt"
              state={p.jobs.applied > 0 ? `${p.jobs.applied} applied` : 'Start'} tone={p.jobs.applied === 0 ? 'setup' : 'ok'} />
            <StatusTile href="#corner" Icon={Users} label="Your corner"
              state={p.corner.support > 0 ? `${p.corner.support} ${p.corner.support === 1 ? 'person' : 'people'}` : 'Add someone'} tone={p.corner.support === 0 ? 'setup' : 'ok'} />
          </div>
        </section>
      )}

      {/* ─── Wins ─── */}
      {!fresh && (p.wins.steps + p.wins.planDone + p.wins.checkins + p.wins.applied) > 0 && (
        <section className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700"><Trophy className="h-3.5 w-3.5" /> Your wins</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.wins.steps > 0 && <WinChip n={p.wins.steps} label="compass steps" />}
            {p.wins.planDone > 0 && <WinChip n={p.wins.planDone} label="plan steps done" />}
            {p.wins.checkins > 0 && <WinChip n={p.wins.checkins} label="check-ins" />}
            {p.wins.applied > 0 && <WinChip n={p.wins.applied} label="jobs applied" />}
          </div>
        </section>
      )}

      {/* ─── Biggest gap ─── */}
      {!fresh && p.readiness.gaps.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="inline-flex items-center gap-2 text-base font-bold text-navy-900"><Sparkles className="h-4 w-4 text-teal-600" /> Close your biggest gap</h2>
          <p className="mt-0.5 text-sm text-slate-600">The areas that would move your readiness most right now.</p>
          <ul className="mt-3 space-y-2">
            {p.readiness.gaps.slice(0, 2).map((g) => (
              <li key={g.label}>
                <Link href={g.url} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 transition hover:border-teal-400 hover:shadow-sm">
                  <span className="text-sm font-semibold text-navy-900">{g.label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-teal-700" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── Your corner (full management) ─── */}
      <CornerSection contacts={contacts} />

      {/* ─── Work search (scored matches are progressive enhancement) ─── */}
      {!fresh && <WorkSearch profile={p} />}

      {/* ─── Who you're becoming ─── */}
      <FutureSelfSection value={futureSelf} />

      {/* ─── Explore your tools ─── */}
      <ToolsGrid />

      {/* ─── The receipts ─── */}
      <EvidencePanel />

      <p className="mb-2 mt-2 text-center text-[11px] text-slate-400">Planning details stay in this browser. You decide what to export or share.</p>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4 py-8" aria-busy="true" aria-label="Loading your workspace">
      <div className="h-14 rounded-2xl bg-slate-100" />
      <div className="h-[28rem] rounded-3xl bg-slate-100" />
    </div>
  );
}

function DashboardOnboardingState() {
  return (
    <div className="constellation-workspace animate-fade-in py-8 sm:py-14" data-testid="dashboard-onboarding-required">
      <section className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-navy-900/15 bg-navy-900 px-6 py-12 text-white shadow-pop sm:px-12 sm:py-16 lg:px-16">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute -bottom-44 -left-24 h-96 w-96 rounded-full bg-sunset-500/15 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-300/70 to-transparent" />
        </div>

        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-200">
            <Sparkles className="h-4 w-4" /> Your workspace is ready
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            Let&apos;s build your Navigator.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            Nothing has been filled in yet. Complete the four-step onboarding wizard so your plan, recommendations, and job matches are based only on what you choose to share.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/onboarding" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-300 px-6 py-3 text-sm font-bold text-navy-900 transition hover:-translate-y-0.5 hover:bg-teal-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-200">
              Start onboarding <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/jobs" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/10">
              <Briefcase className="h-4 w-4" /> Browse jobs first
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
          {[
            ['01', 'Your answers', 'No assumptions or prefilled personal details.'],
            ['02', 'Your control', 'Skip anything you are not ready to share.'],
            ['03', 'Your path', 'Recommendations appear only after setup.'],
          ].map(([number, title, detail]) => (
            <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="text-xs font-bold tracking-[0.18em] text-sunset-300">{number}</span>
              <h2 className="mt-3 text-sm font-bold text-white">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ───────────────────────── Status tile ─────────────────────────
const TILE_TONE: Record<string, string> = {
  ok: 'text-teal-700', attention: 'text-amber-700', at_risk: 'text-rose-700', setup: 'text-slate-500',
};
function StatusTile({ href, Icon, label, state, ring, tone }: { href: string; Icon: typeof Compass; label: string; state: string; ring?: number; tone: 'ok' | 'attention' | 'at_risk' | 'setup' }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-card-hover">
      {ring != null ? (
        <ProgressRing pct={ring} size={40} stroke={4} />
      ) : (
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span>
      )}
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={'block truncate text-sm font-bold ' + TILE_TONE[tone]}>{state}</span>
      </span>
    </Link>
  );
}

function WinChip({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
      <span className="text-sm font-bold">{n}</span> {label}
    </span>
  );
}

// ───────────────────────── Work search lane ─────────────────────────
function WorkSearch({ profile }: { profile: NavigatorProfile }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // false until we've checked for a profile (avoids flashing the upsell to returning users)
  const [matches, setMatches] = useState<MatchesResponseDto | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResultDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedIds = useSavedJobIds();
  const recentIds = useRecentJobIds();
  const applications = useApplications();
  const appliedIds = Object.keys(applications);

  useEffect(() => {
    const id = getUserId();
    setUserId(id);
    setReady(true);
    if (!id) return;
    setLoading(true);
    Promise.all([getMatches(id, 20), getAssessmentResult(id).catch(() => null)])
      .then(([m, a]) => { setMatches(m); setAssessment(a); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const hasPersonal = savedIds.length > 0 || appliedIds.length > 0 || recentIds.length > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your work search</h2>

      {/* Personal lists (independent of server matches) */}
      {hasPersonal && (
        <div className="grid gap-6 lg:grid-cols-2">
          {savedIds.length > 0 && (
            <PersonalSection Icon={Bookmark} tone="teal" title="Saved jobs" count={savedIds.length} description="Postings you bookmarked to revisit.">
              <MiniJobList ids={savedIds} emptyMessage="Nothing saved yet." rightSlot={(job) => <SaveJobButton jobId={job.id} />} />
            </PersonalSection>
          )}
          {appliedIds.length > 0 && (
            <PersonalSection Icon={ClipboardList} tone="sunset" title="Applications" count={appliedIds.length} description="Update status as things progress.">
              <MiniJobList ids={appliedIds} emptyMessage="No applications tracked yet." rightSlot={(job) => {
                const app = applications[job.id];
                if (!app) return null; // row can briefly outlive its store entry when status is cleared
                return (
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">{statusLabel(app.status)}</span>
                    <ApplicationStatusPicker jobId={job.id} />
                  </div>
                );
              }} />
            </PersonalSection>
          )}
          {recentIds.length > 0 && (
            <PersonalSection Icon={History} tone="slate" title="Recently viewed" count={recentIds.length} description="Last jobs you opened.">
              <MiniJobList ids={recentIds} emptyMessage="No recently viewed jobs." />
            </PersonalSection>
          )}
        </div>
      )}

      {/* Scored matches — only when a match profile exists */}
      {!ready ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <JobCardSkeleton key={i} />)}</div>
      ) : !userId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><SearchCheck className="h-5 w-5" /></span>
            <div>
              <p className="text-base font-semibold text-navy-900">See jobs scored for you</p>
              <p className="text-xs text-slate-600">Build a quick match profile and we&apos;ll rank real jobs against your background — explained in plain English.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/onboarding" className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Build my match profile</Link>
            <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700">Browse all</Link>
          </div>
        </div>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <JobCardSkeleton key={i} />)}</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Couldn&apos;t load your matches</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>
            <button onClick={() => { clearUserId(); window.location.href = '/onboarding'; }} className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Start over</button>
          </div>
        </div>
      ) : matches ? (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <p className="text-sm text-slate-600">Scored against <strong className="text-navy-900">{matches.counts.pool.toLocaleString()}</strong> active jobs:</p>
            <CountPill tone="teal" Icon={Trophy} label="Top" value={matches.counts.top} />
            <CountPill tone="amber" Icon={TrendingUp} label="Medium" value={matches.counts.medium} />
            <CountPill tone="rose" Icon={AlertTriangle} label="Higher-barrier" value={matches.counts.avoid} />
          </div>

          {!assessment && (
            <Link href="/assessment" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 shadow-card transition hover:shadow-card-hover">
              <span className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white"><Brain className="h-5 w-5" /></span>
                <span>
                  <span className="block text-sm font-semibold text-navy-900">Discover careers that fit you (5 min)</span>
                  <span className="block text-xs text-slate-600">A DOL interest profiler — nudges your matches toward what you&apos;d enjoy.</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-teal-700" />
            </Link>
          )}

          <Section title="Top matches" count={matches.counts.top} tone="teal" description="Strong overall fit, no legal barriers flagged.">
            {matches.topMatches.length === 0 ? <EmptyState>No strong matches yet — add target industries and skills in your profile.</EmptyState> : (
              <div className="grid gap-4 md:grid-cols-2">{matches.topMatches.map((m) => <JobCard key={m.jobId} match={m} />)}</div>
            )}
          </Section>
          {matches.mediumMatches.length > 0 && (
            <Section title="Medium matches" count={matches.counts.medium} tone="amber" description="Partial fit — worth a look.">
              <div className="grid gap-4 md:grid-cols-2">{matches.mediumMatches.map((m) => <JobCard key={m.jobId} match={m} />)}</div>
            </Section>
          )}
          {matches.avoid.length > 0 && (
            <Section title="Higher-barrier roles — here&rsquo;s why" count={matches.counts.avoid} tone="rose" description="A legal restriction would likely block you right now. We show the reason so you can decide.">
              <div className="grid gap-4 md:grid-cols-2">{matches.avoid.map((m) => <AvoidCard key={m.jobId + m.reasons.join('|')} item={m} />)}</div>
            </Section>
          )}
          <Section title="Grow into more matches" tone="teal" description="Skills or certs that would most expand your match pool.">
            <InsightsPanel userId={userId} />
          </Section>
        </>
      ) : null}
    </div>
  );
}

// ───────────────────────── shared pieces ─────────────────────────
function PersonalSection({ title, count, description, Icon, tone, children }: { title: string; count?: number; description: string; Icon: typeof Bookmark; tone: 'teal' | 'sunset' | 'slate'; children: React.ReactNode }) {
  const toneCls = tone === 'teal' ? 'bg-teal-50 text-teal-700' : tone === 'sunset' ? 'bg-sunset-50 text-sunset-700' : 'bg-slate-100 text-slate-600';
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${toneCls}`}><Icon className="h-4 w-4" /></span>
        <div>
          <h3 className="text-base font-semibold text-navy-900">{title}{typeof count === 'number' && <span className="ml-1.5 text-sm font-medium text-slate-500">({count})</span>}</h3>
          <p className="text-xs text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CountPill({ tone, Icon, label, value }: { tone: 'teal' | 'amber' | 'rose'; Icon: typeof Trophy; label: string; value: number }) {
  const toneCls = tone === 'teal' ? 'bg-teal-50 text-teal-800 border-teal-200' : tone === 'amber' ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-rose-50 text-rose-800 border-rose-200';
  const iconCls = tone === 'teal' ? 'text-teal-600' : tone === 'amber' ? 'text-amber-600' : 'text-rose-600';
  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 ${toneCls}`}>
      <Icon className={`h-4 w-4 ${iconCls}`} aria-hidden="true" />
      <div className="leading-tight"><div className="text-base font-bold">{value.toLocaleString()}</div><div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div></div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{children}</p>;
}
