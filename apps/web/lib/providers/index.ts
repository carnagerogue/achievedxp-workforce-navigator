/**
 * Provider registry + ingestion orchestrator.
 *
 * Call `fetchLiveJobs()` to get a fresh merged, deduped JobDto[] from
 * every enabled provider. Results are cached in-memory with the TTL set
 * by JOBS_CACHE_TTL_SECONDS (default 600 = 10 min). The cache is
 * per-server-process; on Railway with 1 replica this is fine, and on a
 * multi-replica deploy each replica simply maintains its own copy.
 *
 * If every provider returns empty (no API keys configured, all upstreams
 * down, or a network blackhole), `fetchLiveJobs()` returns null and the
 * caller should fall back to the bundled mock dataset.
 */

import type { JobDto } from '@dxp/shared';
import { dedupKey, type JobProvider } from './types';
import { usajobsProvider } from './usajobs';
import { adzunaProvider } from './adzuna';
import { remotiveProvider } from './remotive';
import { joobleProvider } from './jooble';
import { museProvider } from './muse';
import { ziprecruiterProvider } from './ziprecruiter';
import { monsterProvider } from './monster';

const ALL_PROVIDERS: JobProvider[] = [
  usajobsProvider,
  adzunaProvider,
  remotiveProvider,
  joobleProvider,
  museProvider,
  ziprecruiterProvider,
  monsterProvider,
];

interface CacheEntry {
  fetchedAt: number;
  jobs: JobDto[];
  perProvider: Array<{ code: string; name: string; count: number; ok: boolean }>;
}

let cache: CacheEntry | null = null;
let inflight: Promise<CacheEntry> | null = null;

function ttlMs(): number {
  return Number(process.env.JOBS_CACHE_TTL_SECONDS ?? 600) * 1000;
}

/**
 * Fetch every enabled provider in parallel, merge + dedupe, and cache.
 * Returns `null` only when *no* enabled provider produced any jobs —
 * callers can interpret null as "fall back to mock data."
 */
export async function fetchLiveJobs(): Promise<{
  jobs: JobDto[];
  perProvider: CacheEntry['perProvider'];
  cached: boolean;
} | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < ttlMs()) {
    return { jobs: cache.jobs, perProvider: cache.perProvider, cached: true };
  }
  // De-dupe concurrent refresh attempts so a burst of requests doesn't
  // fan out into N parallel ingestions.
  if (!inflight) {
    inflight = (async () => {
      const enabled = ALL_PROVIDERS.filter((p) => p.enabled());
      const settled = await Promise.allSettled(enabled.map((p) => p.fetch()));

      const perProvider = settled.map((r, i) => ({
        code: enabled[i].code,
        name: enabled[i].name,
        count: r.status === 'fulfilled' ? r.value.length : 0,
        ok: r.status === 'fulfilled',
      }));

      const merged: JobDto[] = [];
      const seen = new Set<string>();
      for (const r of settled) {
        if (r.status !== 'fulfilled') continue;
        for (const j of r.value) {
          const k = dedupKey(j);
          if (seen.has(k)) continue;
          seen.add(k);
          merged.push(j);
        }
      }

      cache = { fetchedAt: Date.now(), jobs: merged, perProvider };
      return cache;
    })().finally(() => { inflight = null; });
  }
  const fresh = await inflight;
  if (fresh.jobs.length === 0) return null;
  return { jobs: fresh.jobs, perProvider: fresh.perProvider, cached: false };
}

/**
 * List which providers the operator has wired up (regardless of whether
 * they returned anything). Used to power the home-page "LIVE JOB SOURCES"
 * counter so it shows the configured surface, not just the providers
 * that happened to return non-empty on the last ingest.
 */
export function listEnabledProviders(): Array<{ code: string; name: string }> {
  return ALL_PROVIDERS.filter((p) => p.enabled()).map((p) => ({ code: p.code, name: p.name }));
}

/** Inverse of the above — useful for status pages. */
export function listAllProviders(): Array<{ code: string; name: string; enabled: boolean }> {
  return ALL_PROVIDERS.map((p) => ({ code: p.code, name: p.name, enabled: p.enabled() }));
}
