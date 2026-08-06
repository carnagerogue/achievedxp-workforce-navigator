/**
 * Pure, React-free selectors over a Participant's task list. These power the
 * command-center columns ("who needs attention today", momentum, progress
 * rings) and the workspace header. No DOM, no localStorage — unit-testable.
 *
 * Thin adapter over progress-core.ts (shared with plan-progress.ts): a Task
 * already matches the core entity shape (title/dueDate/completedAt), so the
 * task selectors delegate straight through; only the supervision-specific
 * signals (conditions, fees, needs-attention) live here.
 */
import type { Participant, Task } from './caseworker-store';
import { complianceFromConditions, feeIsBehind } from './supervision';
import {
  openOf, completedOf, progressPct as corePct, overdueOf, dueSoonOf, nextDueOf,
  momentum as coreMomentum, type Momentum,
} from './progress-core';

export type { Momentum };

export function openTasks(p: Participant): Task[] {
  return openOf(p.tasks ?? []);
}

export function completedTasks(p: Participant): Task[] {
  return completedOf(p.tasks ?? []);
}

/** 0–100, completed / total. 0 when there are no tasks. */
export function progressPct(p: Participant): number {
  return corePct(p.tasks ?? []);
}

/** Open tasks whose due date is before today. */
export function overdueTasks(p: Participant, now: number = Date.now()): Task[] {
  return overdueOf(p.tasks ?? [], now);
}

/** Open tasks due within the next `days` (inclusive of today), not yet overdue. */
export function dueSoonTasks(p: Participant, days = 3, now: number = Date.now()): Task[] {
  return dueSoonOf(p.tasks ?? [], days, now);
}

/** Soonest-due open task (overdue counts), else the oldest open task. */
export function nextDueTask(p: Participant): Task | null {
  return nextDueOf(p.tasks ?? []);
}

/**
 * Trailing-window read on whether work is moving. Compares completions in the
 * last `windowDays` vs the prior window: more recent → rising, some → steady,
 * none with open work → stalled.
 */
export function momentum(p: Participant, windowDays = 14, now: number = Date.now()): Momentum {
  return coreMomentum(p.tasks ?? [], windowDays, now);
}

/** Most recent signal of activity — max of updatedAt and any completedAt. */
export function lastActivityAt(p: Participant): number {
  const completions = (p.tasks ?? []).map((t) => t.completedAt ?? 0);
  return Math.max(p.updatedAt || 0, ...(completions.length ? completions : [0]));
}

/** Overdue supervision conditions — a technical-violation risk. */
export function overdueConditionCount(p: Participant): number {
  return complianceFromConditions(p.conditions ?? []).overdue;
}

/** Obligations past due with a balance — also a technical-violation risk. */
export function behindFeeCount(p: Participant, now: number = Date.now()): number {
  return (p.fees ?? []).filter((o) => feeIsBehind(o, now)).length;
}

/** True if this person should bubble to the top of "needs attention today". */
export function needsAttention(p: Participant, now: number = Date.now()): boolean {
  return (
    overdueConditionCount(p) > 0 ||
    behindFeeCount(p, now) > 0 ||
    overdueTasks(p, now).length > 0 ||
    momentum(p, 14, now) === 'stalled' ||
    (p.tasks ?? []).length === 0
  );
}
