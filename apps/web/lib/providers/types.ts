/**
 * Shared types for the in-app provider layer. Each provider exports an
 * implementation of JobProvider and is wired into the registry in
 * lib/providers/index.ts.
 */

import type { JobDto } from '@dxp/shared';

export interface JobProvider {
  /** Stable id for dedup + source-attribution. Matches `sourceCode` on JobDto. */
  readonly code: string;
  /** Human-readable name shown in UI badges. */
  readonly name: string;
  /** Returns true when this provider has the env vars it needs to run. */
  enabled(): boolean;
  /** Fetch + normalize. Errors should be caught and logged; never throw past this boundary. */
  fetch(): Promise<JobDto[]>;
}

/** Stable dedup key — same posting from multiple aggregators collapses to one. */
export function dedupKey(j: Pick<JobDto, 'title' | 'company' | 'locationCity' | 'locationRegion'>): string {
  const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${norm(j.title)}|${norm(j.company)}|${norm(j.locationCity)}|${norm(j.locationRegion)}`;
}

/** Reject malformed, expired, implausibly future, and stale live postings. */
export function isFreshJob(j: Pick<JobDto, 'postedAt' | 'expiresAt'>, now = Date.now(), maxAgeDays = 120): boolean {
  const day = 86_400_000;
  if (!j.postedAt) return false;
  const posted = new Date(j.postedAt).getTime();
  if (!Number.isFinite(posted)) return false;
  if (posted > now + 2 * day || posted < now - maxAgeDays * day) return false;
  if (j.expiresAt) {
    const expires = new Date(j.expiresAt).getTime();
    if (!Number.isFinite(expires) || expires < now) return false;
  }
  return true;
}
