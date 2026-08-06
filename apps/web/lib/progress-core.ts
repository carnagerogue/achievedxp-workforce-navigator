/**
 * Shared progress math — the single implementation behind plan-progress.ts
 * (the individual's checklist) and caseworker-progress.ts (a participant's
 * tasks). Pure and React-free: due-date parsing, overdue / due-soon windows,
 * completion percentage, and the trailing-window momentum read all live here
 * so the two sides of the app can never drift apart.
 *
 * Functions are generic over any entity that structurally matches
 * ProgressEntity, so adapters keep their concrete types (ChecklistItem, Task)
 * on the way out.
 */

export interface ProgressEntity {
  /** 'planned' | 'contacted' | 'scheduled' | 'completed' — only 'completed' is special here. */
  status: string;
  /** ISO yyyy-mm-dd. */
  dueDate?: string;
  /** Epoch ms set when the entity was completed (powers momentum). */
  completedAt?: number;
  title: string;
  /** Epoch ms — tiebreak for nextDueOf when nothing carries a due date. */
  createdAt?: number;
}

const DAY = 24 * 60 * 60 * 1000;

/** Start-of-day epoch for a yyyy-mm-dd string, treated in local time. NaN when missing/invalid. */
export function dueEpoch(due?: string): number {
  if (!due) return NaN;
  const [y, m, d] = due.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d).getTime();
}

/** Start-of-day (local) epoch for `now`. */
export function startOfDay(now: number = Date.now()): number {
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}

/**
 * Whole days from today until the due date: 0 = due today, negative = overdue,
 * NaN when there is no parseable date. Rounded so DST shifts don't skew it.
 */
export function daysAway(due: string | undefined, now: number = Date.now()): number {
  const e = dueEpoch(due);
  if (Number.isNaN(e)) return NaN;
  return Math.round((e - startOfDay(now)) / DAY);
}

export const openOf = <T extends ProgressEntity>(items: T[]): T[] =>
  items.filter((i) => i.status !== 'completed');

export const completedOf = <T extends ProgressEntity>(items: T[]): T[] =>
  items.filter((i) => i.status === 'completed');

/** 0–100, completed / total. 0 when there are no items. */
export function progressPct(items: ProgressEntity[]): number {
  if (items.length === 0) return 0;
  return Math.round((completedOf(items).length / items.length) * 100);
}

/** Open items whose due date is before today, soonest (most overdue) first. */
export function overdueOf<T extends ProgressEntity>(items: T[], now: number = Date.now()): T[] {
  const cutoff = startOfDay(now);
  return openOf(items)
    .filter((i) => {
      const e = dueEpoch(i.dueDate);
      return !Number.isNaN(e) && e < cutoff;
    })
    .sort((a, b) => dueEpoch(a.dueDate) - dueEpoch(b.dueDate));
}

/** Open items due within the next `days` (inclusive of today), not yet overdue. */
export function dueSoonOf<T extends ProgressEntity>(items: T[], days = 7, now: number = Date.now()): T[] {
  const start = startOfDay(now);
  const end = start + days * DAY;
  return openOf(items)
    .filter((i) => {
      const e = dueEpoch(i.dueDate);
      return !Number.isNaN(e) && e >= start && e <= end;
    })
    .sort((a, b) => dueEpoch(a.dueDate) - dueEpoch(b.dueDate));
}

/** Soonest-due open item (overdue counts), else the oldest open item by createdAt. */
export function nextDueOf<T extends ProgressEntity>(items: T[]): T | null {
  const open = openOf(items);
  if (open.length === 0) return null;
  const dated = open.filter((i) => !Number.isNaN(dueEpoch(i.dueDate)));
  if (dated.length) {
    return dated.reduce((a, b) => (dueEpoch(a.dueDate) <= dueEpoch(b.dueDate) ? a : b));
  }
  return open.reduce((a, b) => ((a.createdAt ?? 0) <= (b.createdAt ?? 0) ? a : b));
}

export type Momentum = 'stalled' | 'steady' | 'rising';

/**
 * Trailing-window read on whether work is moving. Compares completions in the
 * last `windowDays` vs the prior window: more recent → rising, some → steady,
 * none with open work → stalled.
 */
export function momentum(items: ProgressEntity[], windowDays = 14, now: number = Date.now()): Momentum {
  if (items.length === 0) return 'steady';
  const win = windowDays * DAY;
  const recent = items.filter((i) => i.completedAt && now - i.completedAt <= win).length;
  const prior = items.filter((i) => i.completedAt && now - i.completedAt > win && now - i.completedAt <= 2 * win).length;
  if (recent > prior && recent > 0) return 'rising';
  if (recent > 0) return 'steady';
  return openOf(items).length > 0 ? 'stalled' : 'steady';
}
