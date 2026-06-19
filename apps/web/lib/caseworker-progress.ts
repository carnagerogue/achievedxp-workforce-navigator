/**
 * Pure, React-free selectors over a Participant's task list. These power the
 * command-center columns ("who needs attention today", momentum, progress
 * rings) and the workspace header. No DOM, no localStorage — unit-testable.
 */
import type { Participant, Task } from './caseworker-store';

const DAY = 24 * 60 * 60 * 1000;

/** Start-of-day epoch for a yyyy-mm-dd string, treated in local time. */
function dueEpoch(due: string): number {
  const [y, m, d] = due.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d).getTime();
}

export function openTasks(p: Participant): Task[] {
  return (p.tasks ?? []).filter((t) => t.status !== 'completed');
}

export function completedTasks(p: Participant): Task[] {
  return (p.tasks ?? []).filter((t) => t.status === 'completed');
}

/** 0–100, completed / total. 0 when there are no tasks. */
export function progressPct(p: Participant): number {
  const all = p.tasks ?? [];
  if (all.length === 0) return 0;
  return Math.round((completedTasks(p).length / all.length) * 100);
}

/** Open tasks whose due date is before today. */
export function overdueTasks(p: Participant, now: number = Date.now()): Task[] {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const cutoff = today.getTime();
  return openTasks(p)
    .filter((t) => t.dueDate && !Number.isNaN(dueEpoch(t.dueDate)) && dueEpoch(t.dueDate) < cutoff)
    .sort((a, b) => dueEpoch(a.dueDate!) - dueEpoch(b.dueDate!));
}

/** Open tasks due within the next `days` (inclusive of today), not yet overdue. */
export function dueSoonTasks(p: Participant, days = 3, now: number = Date.now()): Task[] {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const start = today.getTime();
  const end = start + days * DAY;
  return openTasks(p)
    .filter((t) => {
      if (!t.dueDate) return false;
      const e = dueEpoch(t.dueDate);
      return !Number.isNaN(e) && e >= start && e <= end;
    })
    .sort((a, b) => dueEpoch(a.dueDate!) - dueEpoch(b.dueDate!));
}

/** Soonest-due open task (overdue counts), else the oldest open task. */
export function nextDueTask(p: Participant): Task | null {
  const open = openTasks(p);
  if (open.length === 0) return null;
  const dated = open.filter((t) => t.dueDate && !Number.isNaN(dueEpoch(t.dueDate)));
  if (dated.length) {
    return dated.reduce((a, b) => (dueEpoch(a.dueDate!) <= dueEpoch(b.dueDate!) ? a : b));
  }
  return open.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
}

export type Momentum = 'stalled' | 'steady' | 'rising';

/**
 * Trailing-window read on whether work is moving. Compares completions in the
 * last `windowDays` vs the prior window: more recent → rising, some → steady,
 * none with open work → stalled.
 */
export function momentum(p: Participant, windowDays = 14, now: number = Date.now()): Momentum {
  const tasks = p.tasks ?? [];
  if (tasks.length === 0) return 'steady';
  const win = windowDays * DAY;
  const recent = tasks.filter((t) => t.completedAt && now - t.completedAt <= win).length;
  const prior = tasks.filter((t) => t.completedAt && now - t.completedAt > win && now - t.completedAt <= 2 * win).length;
  if (recent > prior && recent > 0) return 'rising';
  if (recent > 0) return 'steady';
  return openTasks(p).length > 0 ? 'stalled' : 'steady';
}

/** Most recent signal of activity — max of updatedAt and any completedAt. */
export function lastActivityAt(p: Participant): number {
  const completions = (p.tasks ?? []).map((t) => t.completedAt ?? 0);
  return Math.max(p.updatedAt || 0, ...(completions.length ? completions : [0]));
}

/** True if this person should bubble to the top of "needs attention today". */
export function needsAttention(p: Participant, now: number = Date.now()): boolean {
  return (
    overdueTasks(p, now).length > 0 ||
    momentum(p, 14, now) === 'stalled' ||
    (p.tasks ?? []).length === 0
  );
}
