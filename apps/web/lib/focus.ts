/**
 * The ONE next-step engine. Before this existed there were three competing
 * "what should I do next" producers (reentry-journey.nextStep,
 * plan-progress.nextStep, and TodayFocus's inline deadline scan) that never
 * reconciled. This module merges every signal the app holds into a single
 * prioritized queue; the home page renders queue[0] as the hero and the rest
 * as the "staying on track" list.
 *
 * Priority (evidence-first — a preventable violation beats everything):
 *   1. overdue   — supervision report, conditions, fees behind, plan steps
 *   2. soon      — the same, due within a week
 *   3. compass   — the current Reentry Compass step (the guided spine)
 *   4. plan nudge — a started plan item that needs its next move
 *   5. check-in  — weekly reflection when nothing else needs attention
 *
 * Pure function of the stores' data — unit-testable, no React.
 */
import type { ChecklistItem, CheckIn } from './checklist-store';
import type { SupervisionInfo, SupervisionCondition, FeeObligation } from './supervision';
import { reportDueState, conditionStatus, feeIsBehind, feeBalance, fmtMoney, fmtDate } from './supervision';
import type { JourneyPhase, JourneyStep } from './reentry-journey';

export type FocusTone = 'overdue' | 'soon' | 'go';
export type FocusKind = 'report' | 'condition' | 'fee' | 'plan' | 'compass' | 'nudge' | 'checkin';

export interface FocusEntry {
  id: string;
  tone: FocusTone;
  kind: FocusKind;
  title: string;
  sub?: string;
  /** Where acting on this entry takes you. */
  href?: string;
  /** For condition entries: the condition to mark met (component wires the store call). */
  conditionId?: string;
  /** For the compass entry: the full step, so the hero can render action + evidence. */
  journey?: { phase: JourneyPhase; step: JourneyStep };
}

export interface FocusInput {
  supervision: SupervisionInfo;
  conditions: SupervisionCondition[];
  fees: FeeObligation[];
  items: ChecklistItem[];
  checkins: CheckIn[];
  journeyNext: { phase: JourneyPhase; step: JourneyStep } | null;
}

const DAY = 24 * 60 * 60 * 1000;
export function dueEpoch(d?: string): number {
  if (!d) return NaN;
  const [y, m, dd] = d.split('-').map(Number);
  return y && m && dd ? new Date(y, m - 1, dd).getTime() : NaN;
}
export function daysAway(d?: string): number {
  const e = dueEpoch(d);
  if (Number.isNaN(e)) return NaN;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((e - today.getTime()) / DAY);
}

export function buildFocusQueue(input: FocusInput): FocusEntry[] {
  const { supervision, conditions, fees, items, checkins, journeyNext } = input;
  const queue: FocusEntry[] = [];

  // ── Supervision report deadline ──
  const rds = reportDueState(supervision.nextReportDate);
  if (rds === 'overdue') {
    queue.push({ id: 'report', kind: 'report', tone: 'overdue', href: '/plan',
      title: 'Report to your officer is overdue',
      sub: `Was due ${fmtDate(supervision.nextReportDate)} — contact them today. A missed report is a violation.` });
  } else if (rds === 'due_soon') {
    queue.push({ id: 'report', kind: 'report', tone: 'soon', href: '/plan',
      title: `Report to your officer by ${fmtDate(supervision.nextReportDate)}`,
      sub: 'Don’t miss it — a missed report is a violation.' });
  }

  // ── Conditions (check-ins, tests, programs…) ──
  for (const c of conditions) {
    const s = conditionStatus(c);
    if (s === 'overdue') {
      queue.push({ id: `cond-${c.id}`, kind: 'condition', tone: 'overdue', conditionId: c.id,
        title: `Overdue: ${c.label}`, sub: c.dueDate ? `Was due ${fmtDate(c.dueDate)}` : undefined });
    } else if (s === 'due_soon') {
      queue.push({ id: `cond-${c.id}`, kind: 'condition', tone: 'soon', conditionId: c.id,
        title: `Due soon: ${c.label}`, sub: c.dueDate ? `By ${fmtDate(c.dueDate)}` : undefined });
    }
  }

  // ── Fees behind ──
  for (const o of fees) {
    if (feeIsBehind(o)) {
      queue.push({ id: `fee-${o.id}`, kind: 'fee', tone: 'overdue', href: '/plan',
        title: `Payment behind: ${o.label}`,
        sub: `${fmtMoney(feeBalance(o))} owed${o.dueDate ? ` · was due ${fmtDate(o.dueDate)}` : ''}` });
    }
  }

  // ── Plan steps with target dates ──
  for (const it of items) {
    if (it.status === 'completed' || !it.targetDate) continue;
    const d = daysAway(it.targetDate);
    if (Number.isNaN(d)) continue;
    if (d < 0) {
      queue.push({ id: `step-${it.id}`, kind: 'plan', tone: 'overdue', href: '/plan',
        title: `Overdue step: ${it.name}`, sub: `Was set for ${fmtDate(it.targetDate)}` });
    } else if (d <= 7) {
      queue.push({ id: `step-${it.id}`, kind: 'plan', tone: 'soon', href: '/plan',
        title: `This week: ${it.name}`, sub: `By ${fmtDate(it.targetDate)}` });
    }
  }

  // Deadlines first, most urgent tone leading.
  const rank: Record<FocusTone, number> = { overdue: 0, soon: 1, go: 2 };
  queue.sort((a, b) => rank[a.tone] - rank[b.tone]);

  // ── The compass step — the guided spine, after anything time-critical ──
  if (journeyNext) {
    queue.push({ id: `compass-${journeyNext.step.id}`, kind: 'compass', tone: 'go',
      title: journeyNext.step.title, sub: journeyNext.step.why,
      href: journeyNext.step.action?.href, journey: journeyNext });
  }

  // ── A started plan item that needs its next move ──
  const contacted = items.find((i) => i.status === 'contacted');
  const scheduled = items.find((i) => i.status === 'scheduled' && !i.targetDate);
  if (contacted) {
    queue.push({ id: `nudge-${contacted.id}`, kind: 'nudge', tone: 'go', href: '/plan',
      title: `Schedule it: ${contacted.name}`, sub: 'You made contact — lock in a date so it happens.' });
  } else if (scheduled) {
    queue.push({ id: `nudge-${scheduled.id}`, kind: 'nudge', tone: 'go', href: '/plan',
      title: `Put a date on: ${scheduled.name}`, sub: 'Scheduled things get done — add the date to your plan.' });
  }

  // ── Weekly check-in, only when nothing is overdue ──
  const lastCheckin = checkins[0]?.date;
  const checkinStale = !lastCheckin || daysAway(lastCheckin) <= -7;
  if (checkinStale && queue.every((f) => f.tone !== 'overdue')) {
    queue.push({ id: 'checkin', kind: 'checkin', tone: 'go', href: '/plan',
      title: 'Log this week’s check-in', sub: 'A quick note keeps your momentum — and shows effort over time.' });
  }

  return queue;
}

/** Counts for the hero attention chip. */
export function focusCounts(queue: FocusEntry[]): { overdue: number; soon: number } {
  return {
    overdue: queue.filter((f) => f.tone === 'overdue').length,
    soon: queue.filter((f) => f.tone === 'soon').length,
  };
}
