/**
 * Pure, React-free selectors over a personal reentry plan (ChecklistItem[]).
 * Powers the My-Plan dashboard: progress, overdue/upcoming, momentum, and a
 * self-directed "next step" nudge.
 *
 * Thin adapter over progress-core.ts (shared with caseworker-progress.ts):
 * maps ChecklistItem's name/targetDate onto the core entity shape; all the
 * date/momentum math lives in the core.
 */
import type { ChecklistItem, ChecklistStatus } from './checklist-store';
import {
  progressPct as corePct, overdueOf, dueSoonOf, momentum as coreMomentum,
  type Momentum, type ProgressEntity,
} from './progress-core';

export type { Momentum };

type Wrapped = ProgressEntity & { item: ChecklistItem };
const wrap = (i: ChecklistItem): Wrapped => ({
  status: i.status, dueDate: i.targetDate, completedAt: i.completedAt,
  title: i.name, createdAt: i.addedAt, item: i,
});
const unwrap = (ws: Wrapped[]): ChecklistItem[] => ws.map((w) => w.item);

export const countByStatus = (items: ChecklistItem[]) =>
  items.reduce(
    (acc, i) => { acc[i.status] = (acc[i.status] ?? 0) + 1; return acc; },
    {} as Record<ChecklistStatus, number>,
  );

export const openItems = (items: ChecklistItem[]) => items.filter((i) => i.status !== 'completed');
export const completedItems = (items: ChecklistItem[]) => items.filter((i) => i.status === 'completed');

export function progressPct(items: ChecklistItem[]): number {
  return corePct(items.map(wrap));
}

export function overdueItems(items: ChecklistItem[], now: number = Date.now()): ChecklistItem[] {
  return unwrap(overdueOf(items.map(wrap), now));
}

export function dueSoonItems(items: ChecklistItem[], days = 7, now: number = Date.now()): ChecklistItem[] {
  return unwrap(dueSoonOf(items.map(wrap), days, now));
}

export function momentum(items: ChecklistItem[], windowDays = 14, now: number = Date.now()): Momentum {
  return coreMomentum(items.map(wrap), windowDays, now);
}

export interface NextStep { label: string; reason: string; severity: 'urgent' | 'suggested' }

/** The single most useful thing the person can do today. */
export function nextStep(items: ChecklistItem[]): NextStep {
  if (items.length === 0) {
    return { label: 'Add your first resource', reason: 'Browse the tabs above and tap “Add to my plan”.', severity: 'suggested' };
  }
  const overdue = overdueItems(items);
  if (overdue.length > 0) {
    const nm = overdue[0].name;
    const label = /^follow up/i.test(nm) ? nm : `Follow up: ${nm}`;
    return { label, reason: `Past your target date${overdue.length > 1 ? ` (+${overdue.length - 1} more overdue)` : ''}.`, severity: 'urgent' };
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
