/**
 * Pure, React-free selectors over a personal reentry plan (ChecklistItem[]).
 * Powers the My-Plan dashboard: progress, overdue/upcoming, momentum, and a
 * self-directed "next step" nudge. Mirrors caseworker-progress.ts but for the
 * individual's own plan.
 */
import type { ChecklistItem, ChecklistStatus } from './checklist-store';

const DAY = 24 * 60 * 60 * 1000;

function dueEpoch(due?: string): number {
  if (!due) return NaN;
  const [y, m, d] = due.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d).getTime();
}

export const countByStatus = (items: ChecklistItem[]) =>
  items.reduce(
    (acc, i) => { acc[i.status] = (acc[i.status] ?? 0) + 1; return acc; },
    {} as Record<ChecklistStatus, number>,
  );

export const openItems = (items: ChecklistItem[]) => items.filter((i) => i.status !== 'completed');
export const completedItems = (items: ChecklistItem[]) => items.filter((i) => i.status === 'completed');

export function progressPct(items: ChecklistItem[]): number {
  if (items.length === 0) return 0;
  return Math.round((completedItems(items).length / items.length) * 100);
}

export function overdueItems(items: ChecklistItem[], now: number = Date.now()): ChecklistItem[] {
  const t = new Date(now); t.setHours(0, 0, 0, 0);
  const cutoff = t.getTime();
  return openItems(items)
    .filter((i) => !Number.isNaN(dueEpoch(i.targetDate)) && dueEpoch(i.targetDate) < cutoff)
    .sort((a, b) => dueEpoch(a.targetDate) - dueEpoch(b.targetDate));
}

export function dueSoonItems(items: ChecklistItem[], days = 7, now: number = Date.now()): ChecklistItem[] {
  const t = new Date(now); t.setHours(0, 0, 0, 0);
  const start = t.getTime();
  const end = start + days * DAY;
  return openItems(items)
    .filter((i) => { const e = dueEpoch(i.targetDate); return !Number.isNaN(e) && e >= start && e <= end; })
    .sort((a, b) => dueEpoch(a.targetDate) - dueEpoch(b.targetDate));
}

export type Momentum = 'stalled' | 'steady' | 'rising';
export function momentum(items: ChecklistItem[], windowDays = 14, now: number = Date.now()): Momentum {
  if (items.length === 0) return 'steady';
  const win = windowDays * DAY;
  const recent = items.filter((i) => i.completedAt && now - i.completedAt <= win).length;
  const prior = items.filter((i) => i.completedAt && now - i.completedAt > win && now - i.completedAt <= 2 * win).length;
  if (recent > prior && recent > 0) return 'rising';
  if (recent > 0) return 'steady';
  return openItems(items).length > 0 ? 'stalled' : 'steady';
}

export interface NextStep { label: string; reason: string; severity: 'urgent' | 'suggested' }

/** The single most useful thing the person can do today. */
export function nextStep(items: ChecklistItem[]): NextStep {
  if (items.length === 0) {
    return { label: 'Add your first resource', reason: 'Browse the tabs above and tap “Add to my plan”.', severity: 'suggested' };
  }
  const overdue = overdueItems(items);
  if (overdue.length > 0) {
    return { label: `Follow up: ${overdue[0].name}`, reason: `Past your target date${overdue.length > 1 ? ` (+${overdue.length - 1} more overdue)` : ''}.`, severity: 'urgent' };
  }
  const soon = dueSoonItems(items);
  if (soon.length > 0) {
    return { label: `Coming up: ${soon[0].name}`, reason: `Due ${soon[0].targetDate}. Prepare what you need.`, severity: 'suggested' };
  }
  const contacted = items.find((i) => i.status === 'contacted');
  if (contacted) {
    return { label: `Schedule: ${contacted.name}`, reason: 'You’ve made contact — lock in an appointment.', severity: 'suggested' };
  }
  const planned = items.find((i) => i.status === 'planned');
  if (planned) {
    return { label: `Reach out: ${planned.name}`, reason: 'Make first contact and set a target date.', severity: 'suggested' };
  }
  return { label: 'Log this week’s check-in', reason: 'Everything’s moving — capture how the week went.', severity: 'suggested' };
}
