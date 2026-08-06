'use client';

import { useEffect, useState } from 'react';
import {
  useChecklist, useOwnerName, usePlanGoals, useCheckins, useReadiness,
  useSupervisionInfo, useConditions, useFees,
} from './checklist-store';
import { useCompletedSteps, useReentryInputs, useFutureSelf } from './reentry-store';
import { useContacts, supportCount, staleSupportContacts } from './support-network';
import { useSavedJobIds, useApplications, useRecentJobIds } from './personal-store';
import { getLocalProfile, type LocalProfile } from './local-profile';
import { assessReadiness, selfToReadinessInput, BAND_LABEL } from './readiness';
import {
  overallProgress, activePhaseKey, nextStep, inCriticalWindow, PHASES,
  type ReentryInputs, type JourneyPhase, type JourneyStep,
} from './reentry-journey';
import {
  complianceFromConditions, reportDueState, feesTotals, feeIsBehind, conditionStatus,
  type ReportDueState, type ComplianceRead,
} from './supervision';

/**
 * The centralized profile — one source of truth that stitches the user's
 * scattered browser-local data (profile, plan, readiness, supervision, Compass
 * journey, Your Corner, job activity) into a single high-level summary. The
 * dashboard reads from here so the picture is consistent everywhere, navigation
 * can be driven off real status, and no surface re-derives numbers the owning
 * tool already computes. Pure composition over existing engines.
 */

/** Map a checklist item's category onto the readiness "completed" vocabulary. */
function readinessCatFromChecklist(c?: string): string | undefined {
  const v = (c || '').toLowerCase();
  if (/hous|shelter/.test(v)) return 'housing';
  if (/transport|transit/.test(v)) return 'transit';
  if (/food/.test(v)) return 'food';
  if (/health|recov|treatment/.test(v)) return 'health';
  if (/legal|record|\bid\b|document/.test(v)) return 'legal';
  if (/child|family/.test(v)) return 'family';
  if (/train|educ|skill/.test(v)) return 'training';
  if (/job|employ/.test(v)) return 'employment';
  return undefined;
}

const DAY = 24 * 60 * 60 * 1000;
function dueEpoch(d?: string): number {
  if (!d) return NaN;
  const [y, m, dd] = d.split('-').map(Number);
  return y && m && dd ? new Date(y, m - 1, dd).getTime() : NaN;
}

export interface NavigatorProfile {
  firstName: string;
  displayName: string;
  location?: string;
  careerGoal: string;
  futureSelf: string;
  onSupervision: boolean;
  inCriticalWindow: boolean;
  hasAnyData: boolean;

  journey: { pct: number; done: number; total: number; phaseKey: string; phaseTitle: string; next: { phase: JourneyPhase; step: JourneyStep } | null };
  readiness: { score: number; band: string; engaged: boolean; gaps: { label: string; url: string }[] };
  plan: { total: number; done: number; pct: number; open: number; nextDueDate?: string };
  compliance: ComplianceRead;
  reportDue: ReportDueState;
  reportDate?: string;
  fees: { balance: number; behind: number };
  corner: { support: number; stale: number; staleNames: string[] };
  checkins: number;
  jobs: { saved: number; applied: number; recent: number };
  wins: { steps: number; checkins: number; planDone: number; applied: number };

  attention: { total: number; overdue: number; soon: number };
  /** The high-level "Steady score" — null until at least 2 signals exist. */
  overall: { score: number | null; band: string };
}

/** Reactive, unified high-level summary of the user. Browser-local only. */
export function useNavigatorProfile(): NavigatorProfile {
  const items = useChecklist();
  const ownerName = useOwnerName();
  const goals = usePlanGoals();
  const checkins = useCheckins();
  const rdAnswers = useReadiness();
  const supervision = useSupervisionInfo();
  const conditions = useConditions();
  const fees = useFees();
  const completedSteps = useCompletedSteps();
  const reentryInputs = useReentryInputs() as ReentryInputs;
  const futureSelf = useFutureSelf();
  const contacts = useContacts();
  const savedIds = useSavedJobIds();
  const applications = useApplications();
  const recentIds = useRecentJobIds();

  const [profile, setProfile] = useState<LocalProfile | null>(null);
  useEffect(() => { setProfile(getLocalProfile()); }, []);

  // ── Identity (reconcile name/goal across stores; plan-typed values win) ──
  const displayName = (ownerName || profile?.displayName || profile?.email?.split('@')[0] || '').trim();
  const firstName = displayName.split(/\s+/)[0] || '';
  const careerGoal = (goals || profile?.desiredIndustries?.[0] || '').trim();

  // ── Readiness (same computation the plan workspace uses) ──
  const completedCategories = items
    .filter((i) => i.status === 'completed')
    .map((i) => readinessCatFromChecklist(i.category))
    .filter((c): c is string => Boolean(c));
  const readiness = assessReadiness(selfToReadinessInput({ careerGoal, completedCategories }), rdAnswers);
  const readinessEngaged = Object.keys(rdAnswers).length > 0 || completedCategories.length > 0;

  // ── Compass journey ──
  const completedSet = new Set(completedSteps);
  const journeyProg = overallProgress(reentryInputs, completedSet);
  const phaseKey = activePhaseKey(reentryInputs, completedSet);
  const phaseTitle = PHASES.find((p) => p.key === phaseKey)?.title ?? '';
  const next = nextStep(reentryInputs, completedSet);

  // ── Plan ──
  const planDone = items.filter((i) => i.status === 'completed').length;
  const planTotal = items.length;
  const openDated = items
    .filter((i) => i.status !== 'completed' && i.targetDate && !Number.isNaN(dueEpoch(i.targetDate)))
    .sort((a, b) => dueEpoch(a.targetDate) - dueEpoch(b.targetDate));
  const nextDueDate = openDated[0]?.targetDate;

  // ── Supervision / compliance ──
  // Every store that can know about supervision counts — including the match
  // profile from onboarding, so a question answered once is never re-asked.
  const onSupervision =
    (supervision.supervisionType != null && supervision.supervisionType !== 'none') ||
    conditions.length > 0 || fees.length > 0 || reentryInputs.onSupervision === true ||
    profile?.onParoleOrProbation === true;
  const compliance = complianceFromConditions(conditions);
  const reportDue = reportDueState(supervision.nextReportDate);
  const ft = feesTotals(fees);

  // ── Your corner ──
  const stale = staleSupportContacts(contacts);

  // ── Attention — split overdue vs due-soon so the hero matches TodayFocus ──
  const now = Date.now();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  let overdue = 0, soon = 0;
  if (reportDue === 'overdue') overdue++; else if (reportDue === 'due_soon') soon++;
  for (const c of conditions) { const s = conditionStatus(c, now); if (s === 'overdue') overdue++; else if (s === 'due_soon') soon++; }
  overdue += fees.filter((o) => feeIsBehind(o, now)).length;
  for (const i of items) {
    if (i.status === 'completed' || !i.targetDate) continue;
    const e = dueEpoch(i.targetDate);
    if (Number.isNaN(e)) continue;
    if (e < todayMs) overdue++; else if (e <= todayMs + 7 * DAY) soon++;
  }
  const attentionCount = overdue + soon;

  // ── Overall "Steady score" — mean of present signals (≥2 to show a number) ──
  const hasComplianceData = conditions.length > 0 || fees.length > 0;
  const appliedCount = Object.keys(applications).length;
  const signals: number[] = [];
  if (journeyProg.done > 0) signals.push(journeyProg.pct);
  if (readinessEngaged) signals.push(readiness.score);
  if (planTotal > 0) signals.push(Math.round((planDone / planTotal) * 100));
  if (hasComplianceData) {
    // Score real compliance data only; fold the officer-report deadline in.
    let cscore = compliance.tone === 'ok' ? 100 : compliance.tone === 'attention' ? 60 : 30;
    if (reportDue === 'overdue') cscore = Math.min(cscore, 30);
    else if (reportDue === 'due_soon') cscore = Math.min(cscore, 60);
    signals.push(cscore);
  }
  if (appliedCount > 0 || savedIds.length > 0) signals.push(Math.min(appliedCount * 25 + (savedIds.length > 0 ? 10 : 0), 100));
  if (contacts.length > 0) signals.push(Math.min(supportCount(contacts) * 50, 100));
  const overallScore = signals.length >= 2 ? Math.round(signals.reduce((a, b) => a + b, 0) / signals.length) : null;
  const overallBand = overallScore == null ? 'Getting started'
    : overallScore >= 70 ? 'Going strong' : overallScore >= 40 ? 'Building momentum' : 'Getting steady';

  const hasAnyData = Boolean(
    displayName || planTotal > 0 || journeyProg.done > 0 || conditions.length > 0 || fees.length > 0 ||
    contacts.length > 0 || appliedCount > 0 || savedIds.length > 0 || readinessEngaged || futureSelf,
  );

  return {
    firstName, displayName, location: profile?.locationCity || profile?.locationPostalCode, careerGoal, futureSelf: (futureSelf || '').trim(),
    onSupervision, inCriticalWindow: inCriticalWindow(reentryInputs), hasAnyData,
    journey: { pct: journeyProg.pct, done: journeyProg.done, total: journeyProg.total, phaseKey, phaseTitle, next },
    readiness: {
      score: readiness.score, band: BAND_LABEL[readiness.band], engaged: readinessEngaged,
      gaps: readiness.gaps.slice(0, 3).map((g) => ({ label: g.gap?.label ?? g.label, url: g.gap?.url ?? '/plan' })),
    },
    plan: { total: planTotal, done: planDone, pct: planTotal ? Math.round((planDone / planTotal) * 100) : 0, open: planTotal - planDone, nextDueDate },
    compliance, reportDue, reportDate: supervision.nextReportDate,
    fees: { balance: ft.balance, behind: ft.behind },
    corner: { support: supportCount(contacts), stale: stale.length, staleNames: stale.map((c) => c.name).slice(0, 2) },
    checkins: checkins.length,
    jobs: { saved: savedIds.length, applied: appliedCount, recent: recentIds.length },
    wins: { steps: completedSteps.length, checkins: checkins.length, planDone, applied: appliedCount },
    attention: { total: attentionCount, overdue, soon },
    overall: { score: overallScore, band: overallBand },
  };
}
