/**
 * ZipRecruiter Publisher Program provider — stub.
 *
 * ZipRecruiter's Publisher API requires:
 *   1. Apply to the program: https://www.ziprecruiter.com/publishers
 *   2. Wait for approval (typically 2-4 weeks; selective).
 *   3. They issue an API key, which goes in ZIPRECRUITER_API_KEY.
 *
 * Without an approved key + key in env, this provider is a no-op so the
 * registry can still safely include it. Implementation pattern below
 * documents the endpoint shape; flip the early `return []` once the key
 * is provisioned.
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const BASE = 'https://api.ziprecruiter.com/jobs/v1';

interface ZipHit {
  id?: string;
  name?: string;
  hiring_company?: { name?: string };
  city?: string;
  state?: string;
  posted_time?: string;
  url?: string;
  snippet?: string;
  category?: string;
  salary_min_annual?: number;
  salary_max_annual?: number;
}

export const ziprecruiterProvider: JobProvider = {
  code: 'ziprecruiter',
  name: 'ZipRecruiter',
  enabled() {
    return !!process.env.ZIPRECRUITER_API_KEY;
  },
  async fetch() {
    if (!this.enabled()) return [];
    const apiKey = process.env.ZIPRECRUITER_API_KEY!;
    const keywords = (process.env.ZIPRECRUITER_KEYWORDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? ['warehouse', 'cdl', 'maintenance']);
    const location = process.env.ZIPRECRUITER_LOCATION ?? 'United States';
    const radius = Number(process.env.ZIPRECRUITER_RADIUS ?? 25);
    const out: JobDto[] = [];
    for (const kw of keywords) {
      const url = new URL(BASE);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('search', kw);
      url.searchParams.set('location', location);
      url.searchParams.set('radius_miles', String(radius));
      url.searchParams.set('jobs_per_page', '50');
      let hits: ZipHit[];
      try {
        const res = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) break;
        const data = (await res.json()) as { jobs?: ZipHit[] };
        hits = data.jobs ?? [];
      } catch {
        break;
      }
      for (const h of hits) out.push(normalize(h));
    }
    return dedupeBy(out, (j) => j.id);
  },
};

function normalize(h: ZipHit): JobDto {
  const id = `ziprecruiter-${h.id ?? Math.random().toString(36).slice(2)}`;
  return applyClassification({
    id,
    title:   h.name ?? '',
    company: h.hiring_company?.name ?? 'Unknown employer',
    description: h.snippet ?? '',
    descriptionHtml: null,
    applyUrl: h.url ?? '',
    locationCity:       h.city ?? null,
    locationRegion:     h.state ?? null,
    locationPostalCode: null,
    locationCountry:    'US',
    employmentType:     'FULL_TIME',
    industry:           h.category?.toLowerCase().replace(/\s+/g, '_') ?? null,
    salaryMin:          h.salary_min_annual ?? null,
    salaryMax:          h.salary_max_annual ?? null,
    salaryCurrency:     'USD',
    requiredSkills: [],
    requiredCertifications: [],
    minYearsExperience: null,
    postedAt:  h.posted_time ?? null,
    expiresAt: null,
    sourceCode: 'ziprecruiter',
    sourceName: 'ZipRecruiter',
  });
}

function dedupeBy<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
