/**
 * "Next best action" — the single most useful thing a caseworker can do for a
 * participant right now, derived from matches, barriers, training gaps and
 * overdue tasks. Pure and unit-testable. First hit on the priority ladder wins.
 */
import type { Participant, Barrier } from './caseworker-store';
import { BARRIER_LABELS } from './caseworker-store';
import { overdueTasks } from './caseworker-progress';

export interface NextBestAction {
  label: string;
  reason: string;
  severity: 'urgent' | 'suggested';
  /** Anchor within the workspace the UI can scroll to. */
  anchor?: 'plan' | 'matches' | 'barriers' | 'training' | 'intake';
}

export interface NbaContext {
  topMatchCount: number;
  trainingGapCount: number;
  dolConfigured?: boolean;
}

/** Barriers that block keeping any job and should be cleared first. */
const BLOCKING_BARRIERS: Barrier[] = ['housing', 'transportation', 'recovery', 'id_documents'];

export function nextBestAction(p: Participant, ctx: NbaContext): NextBestAction {
  const tasks = p.tasks ?? [];

  // 1) Anything overdue is the most urgent thing on the board.
  const overdue = overdueTasks(p);
  if (overdue.length > 0) {
    const t = overdue[0];
    const extra = overdue.length > 1 ? ` (+${overdue.length - 1} more overdue)` : '';
    return {
      label: t.title,
      reason: `Overdue${t.dueDate ? ` since ${t.dueDate}` : ''}${extra} — follow up.`,
      severity: 'urgent',
      anchor: 'plan',
    };
  }

  // 2) A blocking barrier flagged, but no barrier task started yet.
  const hasAnyBarrierTask = tasks.some((t) => t.source === 'barrier');
  const unaddressed = p.barriers.find((b) => BLOCKING_BARRIERS.includes(b));
  if (unaddressed && !hasAnyBarrierTask) {
    return {
      label: `Connect to help: ${BARRIER_LABELS[unaddressed]}`,
      reason: 'A blocking barrier has no plan item yet — address it before applications stall.',
      severity: 'urgent',
      anchor: 'barriers',
    };
  }

  // 3) Strong matches exist but none captured as an application task.
  const hasApplicationTask = tasks.some((t) => t.source === 'match' || t.category === 'application');
  if (ctx.topMatchCount > 0 && !hasApplicationTask) {
    return {
      label: 'Add a top match to the plan',
      reason: `${ctx.topMatchCount} realistic role${ctx.topMatchCount === 1 ? '' : 's'} matched — turn one into an application.`,
      severity: 'suggested',
      anchor: 'matches',
    };
  }

  // 4) A training gap with no training task.
  const hasTrainingTask = tasks.some((t) => t.source === 'training' || t.category === 'training');
  if (ctx.trainingGapCount > 0 && !hasTrainingTask) {
    return {
      label: 'Schedule a credential',
      reason: `${ctx.trainingGapCount} credential gap${ctx.trainingGapCount === 1 ? '' : 's'} across the top matches.`,
      severity: 'suggested',
      anchor: 'training',
    };
  }

  // 5) No location / no matches yet.
  if (!/^\d{5}$/.test(p.location.trim()) || ctx.topMatchCount === 0) {
    return {
      label: 'Set a target ZIP and re-run matches',
      reason: 'A valid ZIP unlocks local roles, wages, training and job centers.',
      severity: 'suggested',
      anchor: 'intake',
    };
  }

  // 6) Otherwise things are moving.
  return {
    label: 'On track — review the 90-day goal',
    reason: 'No overdue items and the plan is progressing.',
    severity: 'suggested',
    anchor: 'plan',
  };
}
