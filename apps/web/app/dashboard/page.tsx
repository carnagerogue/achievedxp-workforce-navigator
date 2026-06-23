'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Settings2, TrendingUp, AlertTriangle, Trophy, RefreshCw, Bookmark, ClipboardList, History,
  Brain, ArrowRight, HeartHandshake, Compass, Gauge, ListChecks, ShieldCheck, ShieldAlert,
  Briefcase, Users, Sparkles, Star, LifeBuoy, Phone, SearchCheck, CalendarClock,
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
import { ToolsGrid } from '../../components/ToolsGrid';
import { NextStepHero } from '../../components/journey/NextStepHero';
import { ApplicationStatusPicker, statusLabel } from '../../components/ApplicationStatusPicker';
import { Avatar } from '../../components/common/Avatar';
import { ProgressRing } from '../../components/common/ProgressRing';
import { useSavedJobIds, useRecentJobIds, useApplications } from '../../lib/personal-store';
import { setStepDone } from '../../lib/reentry-store';

export default function DashboardPage() {
  const p = useNavigatorProfile();
  const [greet, setGreet] = useState('Welcome');
  useEffect(() => {
    const h = new Date().getHours();
    setGreet(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  }, []);

  // Brand-new user with nothing yet — calm, encouraging start.
  if (!p.hasAnyData) {
    return (
      <div className="mx-auto max-w-xl animate-fade-in rounded-3xl border border-slate-200 bg-white bg-hero-radial p-10 text-center shadow-card">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white"><Compass className="h-6 w-6" /></span>
        <h1 className="mt-4 text-2xl font-bold text-navy-900">Let’s get started</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">Your dashboard fills in as you go. The best first move is your reentry compass — one step at a time.</p>
        <Link href="/start" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700">
          Start your compass <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const { overdue, soon } = p.attention;
  const heroTone = overdue > 0 ? 'from-rose-50 to-white' : soon > 0 ? 'from-amber-50 to-white' : 'from-teal-50 to-white';

  return (
    <div className="animate-fade-in space-y-4">
      {/* ─── Hero: greeting + Steady score ─── */}
      <section className={'overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br p-6 shadow-card sm:p-8 ' + heroTone}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={p.displayName || 'You'} size={56} />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{greet}{p.firstName ? `, ${p.firstName}` : ''}.</h1>
              {p.futureSelf
                ? <p className="mt-0.5 text-sm text-slate-600">Working toward: <span className="font-medium text-navy-900">{p.futureSelf}</span></p>
                : p.careerGoal
                ? <p className="mt-0.5 text-sm text-slate-600">Goal: <span className="font-medium text-navy-900">{p.careerGoal}</span></p>
                : <p className="mt-0.5 text-sm text-slate-600">Here’s where you stand today.</p>}
            </div>
          </div>
          {p.overall.score != null && (
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
          ) : (
            <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-teal-100 px-3.5 py-1.5 text-xs font-bold text-teal-700 ring-1 ring-inset ring-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" /> You’re on track
            </span>
          )}
          {p.inCriticalWindow && (
            <Link href="/start" className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-teal-700">
              Your first months — we’ve got the order figured out
            </Link>
          )}
          <Link href="/onboarding" className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-white">
            <Settings2 className="h-3.5 w-3.5" /> Edit profile
          </Link>
        </div>
      </section>

      {/* ─── Do this next ─── */}
      {p.journey.next ? (
        <NextStepHero phase={p.journey.next.phase} step={p.journey.next.step} onDone={() => setStepDone(p.journey.next!.step.id, true)} />
      ) : (
        <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 text-center shadow-card">
          <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700"><Star className="h-5 w-5" /></span>
          <p className="mt-2 text-sm font-bold text-navy-900">You’ve worked every step on your compass.</p>
          <p className="mt-0.5 text-sm text-slate-600">Keep your plan moving and your job steady.</p>
        </section>
      )}

      {/* ─── Staying on track (deadlines) ─── */}
      <div id="today" className="scroll-mt-20"><TodayFocus /></div>

      {/* ─── Status tiles — glance + navigate ─── */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">How you’re doing</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <StatusTile href="/start" Icon={Compass} label="Reentry compass" ring={p.journey.pct} state={p.journey.phaseTitle} tone="ok" />
          {p.readiness.engaged ? (
            <StatusTile href="/local-help?tab=checklist" Icon={Gauge} label="Readiness" ring={p.readiness.score} state={p.readiness.band}
              tone={p.readiness.score >= 65 ? 'ok' : 'attention'} />
          ) : (
            <StatusTile href="/local-help?tab=checklist" Icon={Gauge} label="Readiness" state="Set up" tone="setup" />
          )}
          <StatusTile href="/local-help?tab=checklist" Icon={ListChecks} label="My plan"
            state={p.plan.total > 0 ? `${p.plan.done}/${p.plan.total} done` : 'Set up'} tone={p.plan.total === 0 ? 'setup' : 'ok'} />
          {p.onSupervision && (
            <StatusTile href="/local-help?tab=checklist" Icon={p.compliance.tone === 'at_risk' ? ShieldAlert : ShieldCheck} label="Staying on track"
              state={p.compliance.label} tone={p.compliance.tone} />
          )}
          <StatusTile href="/jobs" Icon={Briefcase} label="Job hunt"
            state={p.jobs.applied > 0 ? `${p.jobs.applied} applied` : 'Start'} tone={p.jobs.applied === 0 ? 'setup' : 'ok'} />
          <StatusTile href="/start#corner" Icon={Users} label="Your corner"
            state={p.corner.support > 0 ? `${p.corner.support} ${p.corner.support === 1 ? 'person' : 'people'}` : 'Add someone'} tone={p.corner.support === 0 ? 'setup' : 'ok'} />
        </div>
      </section>

      {/* ─── Wins ─── */}
      {(p.wins.steps + p.wins.planDone + p.wins.checkins + p.wins.applied) > 0 && (
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
      {p.readiness.gaps.length > 0 && (
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

      {/* ─── Your corner + lifelines ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-base font-bold text-navy-900"><Users className="h-4 w-4 text-teal-600" /> Your corner</h2>
          <Link href="/start#corner" className="text-xs font-semibold text-teal-700 hover:underline">
            {p.corner.support > 0 ? `${p.corner.support} in your corner — manage` : 'Add someone'}
          </Link>
        </div>
        {p.corner.stale > 0 && p.corner.support > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
            <HeartHandshake className="h-3.5 w-3.5" /> It’s been a while — reach out to {p.corner.staleNames.join(' or ')} today.
          </p>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <HelpLink Icon={LifeBuoy} label="Find local help" sub="Call 211" href="tel:211" />
          <HelpLink Icon={HeartHandshake} label="Talk to someone" sub="Call or text 988" href="tel:988" />
          <HelpLink Icon={Phone} label="SAMHSA helpline" sub="1-800-662-4357" href="tel:18006624357" />
        </div>
      </section>

      {/* ─── Work search (scored matches are progressive enhancement) ─── */}
      <WorkSearch profile={p} />

      {/* ─── Explore your tools ─── */}
      <ToolsGrid />
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

function HelpLink({ Icon, label, sub, href }: { Icon: typeof Phone; label: string; sub: string; href: string }) {
  return (
    <a href={href} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-teal-400 hover:shadow-sm">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-navy-900">{label}</span>
        <span className="block text-[11px] text-slate-500">{sub}</span>
      </span>
    </a>
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
              <p className="text-xs text-slate-600">Build a quick match profile and we’ll rank real jobs against your background — explained in plain English.</p>
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
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Couldn’t load your matches</p>
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
                  <span className="block text-xs text-slate-600">A DOL interest profiler — nudges your matches toward what you’d enjoy.</span>
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
            <Section title="Higher-barrier roles — here’s why" count={matches.counts.avoid} tone="rose" description="A legal restriction would likely block you right now. We show the reason so you can decide.">
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
