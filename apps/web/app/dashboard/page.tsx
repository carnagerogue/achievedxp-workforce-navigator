'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings2, TrendingUp, SearchCheck, AlertTriangle, Trophy, RefreshCw, Bookmark, ClipboardList, History, Sparkles, Brain, ArrowRight, HeartHandshake } from 'lucide-react';
import type { MatchesResponseDto } from '@dxp/shared';
import { getMatches, getAssessmentResult, type AssessmentResultDto } from '../../lib/api';
import { getUserId, clearUserId } from '../../lib/session';
import { JobCard } from '../../components/JobCard';
import { AvoidCard } from '../../components/AvoidCard';
import { Section } from '../../components/Section';
import { JobCardSkeleton } from '../../components/Skeleton';
import { MiniJobList } from '../../components/MiniJobList';
import { InsightsPanel } from '../../components/InsightsPanel';
import { SaveJobButton } from '../../components/SaveJobButton';
import { TodayFocus } from '../../components/TodayFocus';
import { ApplicationStatusPicker } from '../../components/ApplicationStatusPicker';
import {
  useSavedJobIds,
  useRecentJobIds,
  useApplications,
} from '../../lib/personal-store';
import { statusLabel } from '../../components/ApplicationStatusPicker';

export default function DashboardPage() {
  const [matches, setMatches] = useState<MatchesResponseDto | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const savedIds  = useSavedJobIds();
  const recentIds = useRecentJobIds();
  const applications = useApplications();
  const appliedIds = Object.keys(applications);

  useEffect(() => {
    const id = getUserId();
    setUserIdState(id);
    if (!id) {
      setLoading(false);
      return;
    }
    Promise.all([
      getMatches(id, 20),
      getAssessmentResult(id).catch(() => null),
    ])
      .then(([m, a]) => { setMatches(m); setAssessment(a); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ─────── Empty states ───────

  if (!loading && !userId) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-card animate-fade-in">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <SearchCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-navy-900">Build your profile first</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          We need a profile before we can score jobs for you. Takes about two minutes.
        </p>
        <Link
          href="/onboarding"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Build my profile →
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-card animate-fade-in">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-rose-800">
          <AlertTriangle className="h-5 w-5" /> Couldn't load matches
        </h1>
        <p className="mt-2 text-sm text-rose-700">{error}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <button
            onClick={() => { clearUserId(); window.location.href = '/onboarding'; }}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  // ─────── Loading skeletons ───────

  if (loading) {
    return (
      <div className="animate-fade-in">
        <SummarySkeleton />
        <SectionSkeleton title="Top matches" />
        <SectionSkeleton title="Medium matches" />
      </div>
    );
  }

  if (!matches) return null;

  const { topMatches, mediumMatches, avoid, counts } = matches;

  return (
    <div className="animate-fade-in">
      {/* ─── Summary banner ─── */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white bg-hero-radial p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">Your dashboard</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Your matches</h1>
            <p className="mt-1 text-sm text-slate-600">
              Scored against <strong className="font-semibold text-navy-900">{counts.pool.toLocaleString()}</strong> active jobs.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 backdrop-blur transition hover:border-slate-400 hover:bg-white"
          >
            <Settings2 className="h-4 w-4" /> Edit profile
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <CountPill tone="teal"  Icon={Trophy}          label="Top"    value={counts.top} />
          <CountPill tone="amber" Icon={TrendingUp}      label="Medium" value={counts.medium} />
          <CountPill tone="rose"  Icon={AlertTriangle}   label="Higher-barrier"  value={counts.avoid} />
        </div>
      </div>

      {/* ─── Staying on track — deadlines that prevent technical violations ─── */}
      <TodayFocus />

      {/* ─── Local help shortcut (always visible) ─── */}
      <Link
        href="/local-help"
        className="group mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sunset-200 bg-gradient-to-br from-sunset-50 to-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sunset-600 text-white">
            <HeartHandshake className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sunset-700">In-person help · CareerOneStop</p>
            <p className="text-base font-semibold text-navy-900">Job Centers + Reentry Programs near you</p>
            <p className="text-xs text-slate-600">Free DOL-backed resources — résumé help, fair-chance employer leads, transitional services.</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-sunset-700 transition group-hover:translate-x-0.5">
          Find help <ArrowRight className="h-4 w-4" />
        </span>
      </Link>

      {/* ─── Career assessment CTA (shown until taken) ─── */}
      {!assessment && (
        <div className="mb-8 flex flex-wrap items-start gap-4 rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6 shadow-card sm:p-7">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white">
            <Brain className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">5-minute assessment</p>
            <h2 className="mt-1 text-lg font-semibold text-navy-900">
              Discover career paths that fit your interests
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              A 30-question interest profiler based on the U.S. Dept of Labor O*NET framework.
              Your results nudge your match scores toward roles that line up with what you'd actually enjoy.
            </p>
          </div>
          <Link
            href="/assessment"
            className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-card-hover"
          >
            Take assessment <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}

      {assessment && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Brain className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your Holland code</p>
              <p className="text-lg font-bold text-navy-900">
                {assessment.hollandCode}
                <span className="ml-2 text-xs font-medium text-slate-500">
                  · top: {assessment.topDimensions.map((d) => d.name).join(' + ')}
                </span>
              </p>
            </div>
          </div>
          <Link href="/assessment" className="text-xs font-semibold text-teal-700 hover:text-teal-800">
            View full results →
          </Link>
        </div>
      )}

      {/* ─── Personal shortcuts ─── */}
      {(savedIds.length > 0 || appliedIds.length > 0 || recentIds.length > 0) && (
        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          {savedIds.length > 0 && (
            <PersonalSection
              Icon={Bookmark}
              tone="teal"
              title="Saved jobs"
              count={savedIds.length}
              description="Postings you bookmarked to revisit later."
            >
              <MiniJobList
                ids={savedIds}
                emptyMessage="Nothing saved yet."
                rightSlot={(job) => <SaveJobButton jobId={job.id} />}
              />
            </PersonalSection>
          )}

          {appliedIds.length > 0 && (
            <PersonalSection
              Icon={ClipboardList}
              tone="sunset"
              title="Applications"
              count={appliedIds.length}
              description="Tracking your pipeline — update status as things progress."
            >
              <MiniJobList
                ids={appliedIds}
                emptyMessage="No applications tracked yet."
                rightSlot={(job) => (
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                      {statusLabel(applications[job.id].status)}
                    </span>
                    <ApplicationStatusPicker jobId={job.id} />
                  </div>
                )}
              />
            </PersonalSection>
          )}

          {recentIds.length > 0 && (
            <PersonalSection
              Icon={History}
              tone="slate"
              title="Recently viewed"
              count={recentIds.length}
              description="Last 12 jobs you opened from this browser."
            >
              <MiniJobList ids={recentIds} emptyMessage="No recently viewed jobs." />
            </PersonalSection>
          )}
        </div>
      )}

      {/* ─── Insights ─── */}
      <Section
        title="Growth suggestions"
        tone="teal"
        description="Certifications or skills that would most expand your match pool — simulated against the live job catalog."
      >
        <InsightsPanel userId={userId!} />
      </Section>

      <Section
        title="Top matches"
        count={counts.top}
        tone="teal"
        description="Strong overall fit — a strong-match rating with no legal barriers flagged."
      >
        {topMatches.length === 0 ? (
          <EmptyState>No strong matches yet — add your target industries and skills in your profile so we can rank by fit.</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {topMatches.map((m, i) => (
              <div key={m.jobId} className="animate-slide-up" style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}>
                <JobCard match={m} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Medium matches"
        count={counts.medium}
        tone="amber"
        description="Partial fit — worth a look if your top matches are thin."
      >
        {mediumMatches.length === 0 ? (
          <EmptyState>No medium matches — that's fine if your top list is healthy.</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {mediumMatches.map((m, i) => (
              <div key={m.jobId} className="animate-slide-up" style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}>
                <JobCard match={m} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Higher-barrier roles — here's why"
        count={counts.avoid}
        tone="rose"
        description="These postings have a legal restriction that would likely block your application right now. We show them — and the reason — so you can decide for yourself and avoid wasted effort."
      >
        {avoid.length === 0 ? (
          <EmptyState>Nothing flagged — no postings in the pool have a barrier that would block you.</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {avoid.map((m, i) => (
              <div key={m.jobId + m.reasons.join('|')} className="animate-slide-up" style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}>
                <AvoidCard item={m} />
              </div>
            ))}
          </div>
        )}
      </Section>

    </div>
  );
}

// Color-tinted section wrapper used for the personal dashboard lanes.
type LucideIcon2 = typeof Sparkles;
function PersonalSection({
  title, count, description, Icon, tone, children,
}: {
  title: string;
  count?: number;
  description: string;
  Icon: LucideIcon2;
  tone: 'teal' | 'sunset' | 'slate';
  children: React.ReactNode;
}) {
  const toneCls =
    tone === 'teal'   ? 'bg-teal-50   text-teal-700'   :
    tone === 'sunset' ? 'bg-sunset-50 text-sunset-700' :
                        'bg-slate-100 text-slate-600';
  return (
    <section>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${toneCls}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-navy-900">
              {title}
              {typeof count === 'number' && (
                <span className="ml-1.5 text-sm font-medium text-slate-500">({count})</span>
              )}
            </h2>
            <p className="text-xs text-slate-600">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

// ───────── pieces ─────────

type LucideIcon = typeof Trophy;

function CountPill({ tone, Icon, label, value }: { tone: 'teal' | 'amber' | 'rose'; Icon: LucideIcon; label: string; value: number }) {
  const toneCls =
    tone === 'teal'  ? 'bg-teal-50  text-teal-800  border-teal-200'
    : tone === 'amber' ? 'bg-amber-50 text-amber-900 border-amber-200'
    : 'bg-rose-50  text-rose-800  border-rose-200';
  const iconCls =
    tone === 'teal'  ? 'text-teal-600'
    : tone === 'amber' ? 'text-amber-600'
    : 'text-rose-600';
  return (
    <div className={`inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 ${toneCls}`}>
      <Icon className={`h-5 w-5 ${iconCls}`} aria-hidden="true" />
      <div className="leading-tight">
        <div className="text-xl font-bold tracking-tight">{value.toLocaleString()}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

function SummarySkeleton() {
  return (
    <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="h-3 w-24 rounded skeleton-shimmer" />
      <div className="mt-2 h-8 w-64 rounded skeleton-shimmer" />
      <div className="mt-2 h-4 w-80 rounded skeleton-shimmer" />
      <div className="mt-5 flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 w-32 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="flex items-baseline gap-2.5 text-lg font-semibold text-navy-900">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          {title}
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <JobCardSkeleton key={i} />)}
      </div>
    </section>
  );
}
