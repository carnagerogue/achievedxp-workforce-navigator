/**
 * Monster Jobs provider via RapidAPI.
 *
 * RapidAPI hosts several community-contributed proxies that surface
 * Monster's job postings. They share an auth pattern:
 *   - X-RapidAPI-Key:  your RapidAPI key
 *   - X-RapidAPI-Host: the proxy's host (e.g. monster-jobs.p.rapidapi.com)
 *
 * Most popular Monster proxies on RapidAPI:
 *   - monster-jobs.p.rapidapi.com         (community "Monster Jobs")
 *   - monster-jobs-api.p.rapidapi.com     ("Monster Jobs API" by letscrape)
 *   - jsearch.p.rapidapi.com              (multi-source including Monster)
 *
 * Config:
 *   MONSTER_API_KEY      — your RapidAPI key. Required.
 *   MONSTER_API_HOST     — defaults to monster-jobs.p.rapidapi.com.
 *                          Set to whatever your proxy's "X-RapidAPI-Host"
 *                          value is.
 *   MONSTER_API_ENDPOINT — full URL of the search endpoint. Defaults to
 *                          `https://${MONSTER_API_HOST}/search`. Override
 *                          if your proxy uses a different path (e.g.
 *                          `/jobs`, `/search/jobs`, `/v1/search`).
 *   MONSTER_KEYWORDS     — comma-separated terms; defaults to fair-chance
 *                          industry standard set.
 *   MONSTER_LOCATION     — defaults to "United States".
 *   MONSTER_MAX_PAGES    — default 1 (RapidAPI free tiers are usually
 *                          ~50-100 calls/month — keep low).
 *
 * Provider parses defensively because each RapidAPI proxy ships slightly
 * different field names: `jobs|data|results`, `url|link|job_url`,
 * `company|company_name|hiring_company`, etc. If your proxy returns
 * nothing, set DEBUG_MONSTER=true to log the raw payload shape.
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const DEFAULT_HOST = 'monster-jobs.p.rapidapi.com';
const DEFAULT_KEYWORDS = ['warehouse', 'forklift', 'cdl driver', 'maintenance', 'custodian', 'cook'];

// Catch-all type — covers the union of fields seen across the popular
// RapidAPI Monster proxies. Every field is optional; normalize() reads
// each one with a fallback chain.
interface MonsterHit {
  job_id?: string | number;
  id?: string | number;
  title?: string;
  job_title?: string;
  name?: string;
  company?: string;
  company_name?: string;
  hiring_company?: string;
  employer_name?: string;
  location?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  description?: string;
  job_description?: string;
  snippet?: string;
  url?: string;
  link?: string;
  job_url?: string;
  job_apply_link?: string;
  salary?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  posted_at?: string;
  date_posted?: string;
  job_posted_at_datetime_utc?: string;
  publication_date?: string;
  employment_type?: string;
  job_employment_type?: string;
  is_remote?: boolean;
  job_is_remote?: boolean;
  category?: string;
  industry?: string;
}

export const monsterProvider: JobProvider = {
  code: 'monster',
  name: 'Monster',
  enabled() {
    return !!process.env.MONSTER_API_KEY;
  },
  async fetch() {
    if (!this.enabled()) return [];
    const apiKey = process.env.MONSTER_API_KEY!;
    const host = process.env.MONSTER_API_HOST ?? DEFAULT_HOST;
    const endpoint = process.env.MONSTER_API_ENDPOINT ?? `https://${host}/search`;
    const keywords = (process.env.MONSTER_KEYWORDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_KEYWORDS);
    const location = process.env.MONSTER_LOCATION ?? 'United States';
    const maxPages = Number(process.env.MONSTER_MAX_PAGES ?? 1);
    const debug = process.env.DEBUG_MONSTER === 'true';

    const out: JobDto[] = [];
    for (const kw of keywords) {
      for (let page = 1; page <= maxPages; page++) {
        const url = new URL(endpoint);
        // Different RapidAPI proxies name the query param differently —
        // we set every common variant; the proxy ignores the rest.
        url.searchParams.set('query', kw);
        url.searchParams.set('q', kw);
        url.searchParams.set('keyword', kw);
        url.searchParams.set('search', kw);
        url.searchParams.set('location', location);
        url.searchParams.set('page', String(page));

        let hits: MonsterHit[];
        try {
          const res = await fetch(url.toString(), {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': host,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(20000),
          });
          if (!res.ok) {
            if (debug) console.warn(`[monster] HTTP ${res.status} for kw="${kw}"`);
            break;
          }
          const data = await res.json() as unknown;
          hits = extractHits(data);
          if (debug) console.log(`[monster] kw="${kw}" page=${page} → ${hits.length} hits`);
        } catch (e) {
          if (debug) console.warn(`[monster] fetch error kw="${kw}":`, e);
          break;
        }
        if (hits.length === 0) break;
        for (const h of hits) {
          const job = normalize(h);
          if (job.title && job.applyUrl) out.push(job);
        }
        if (hits.length < 10) break; // Likely the last page.
      }
    }
    return dedupeBy(out, (j) => j.id);
  },
};

/**
 * Find the array of hits in a RapidAPI response. Different proxies wrap
 * it differently — we check the most common keys in order.
 */
function extractHits(data: unknown): MonsterHit[] {
  if (Array.isArray(data)) return data as MonsterHit[];
  const obj = (data ?? {}) as Record<string, unknown>;
  for (const key of ['data', 'jobs', 'results', 'items', 'hits', 'list', 'records']) {
    const v = obj[key];
    if (Array.isArray(v)) return v as MonsterHit[];
  }
  // Nested data.jobs pattern common in jsearch-style proxies
  const nested = (obj.data as Record<string, unknown> | undefined)?.jobs;
  if (Array.isArray(nested)) return nested as MonsterHit[];
  return [];
}

function normalize(h: MonsterHit): JobDto {
  const id = `monster-${h.job_id ?? h.id ?? hashString(JSON.stringify([h.title, h.company, h.location]))}`;
  const title = h.title ?? h.job_title ?? h.name ?? '';
  const company = h.company ?? h.company_name ?? h.hiring_company ?? h.employer_name ?? 'Unknown employer';
  const description = h.description ?? h.job_description ?? h.snippet ?? '';
  const applyUrl = h.url ?? h.link ?? h.job_url ?? h.job_apply_link ?? '';

  const { city, region } = parseLocation(h);
  const postedAt = h.posted_at ?? h.date_posted ?? h.job_posted_at_datetime_utc ?? h.publication_date ?? null;

  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  if (typeof h.job_min_salary === 'number') salaryMin = h.job_min_salary;
  if (typeof h.job_max_salary === 'number') salaryMax = h.job_max_salary;
  if (salaryMin === null && salaryMax === null && typeof h.salary === 'string') {
    const range = parseSalaryString(h.salary);
    salaryMin = range.min;
    salaryMax = range.max;
  }

  const remoteFlag = !!(h.is_remote || h.job_is_remote);

  return applyClassification({
    id,
    title,
    company,
    description,
    descriptionHtml: null,
    applyUrl,
    locationCity:       city,
    locationRegion:     region,
    locationPostalCode: null,
    locationCountry:    h.job_country ?? 'US',
    remote:             remoteFlag,
    employmentType:     mapEmployment(h.employment_type ?? h.job_employment_type),
    industry:           (h.category ?? h.industry ?? null)?.toLowerCase().replace(/\s+/g, '_') ?? null,
    salaryMin,
    salaryMax,
    salaryCurrency:     'USD',
    requiredSkills: [],
    requiredCertifications: [],
    minYearsExperience: null,
    postedAt,
    expiresAt: null,
    sourceCode: 'monster',
    sourceName: 'Monster',
  });
}

function parseLocation(h: MonsterHit): { city: string | null; region: string | null } {
  if (h.job_city || h.job_state) {
    return { city: h.job_city ?? null, region: h.job_state ?? null };
  }
  if (!h.location) return { city: null, region: null };
  const parts = h.location.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    const r = parts[1].length === 2 ? parts[1].toUpperCase() : parts[1].slice(0, 2).toUpperCase();
    return { city: parts[0] || null, region: r || null };
  }
  return { city: parts[0] || null, region: null };
}

function mapEmployment(raw: string | undefined): JobDto['employmentType'] {
  if (!raw) return 'FULL_TIME';
  const l = raw.toLowerCase();
  if (l.includes('part')) return 'PART_TIME';
  if (l.includes('contract')) return 'CONTRACT';
  if (l.includes('temp')) return 'TEMP';
  if (l.includes('intern')) return 'INTERNSHIP';
  return 'FULL_TIME';
}

function parseSalaryString(s: string): { min: number | null; max: number | null } {
  // Handle "$45,000 - $65,000 / year", "45k-65k", "$22/hour", etc.
  const nums = s.replace(/,/g, '').match(/\d+(?:\.\d+)?(?:k)?/gi) ?? [];
  const toNumber = (n: string): number => {
    const isK = /k$/i.test(n);
    const v = parseFloat(n.replace(/k$/i, ''));
    return isK ? v * 1000 : v;
  };
  const isHourly = /hour|\/hr/i.test(s);
  const vals = nums.map(toNumber).map((v) => (isHourly ? Math.round(v * 2080) : v));
  if (vals.length === 0) return { min: null, max: null };
  if (vals.length === 1) return { min: vals[0], max: vals[0] };
  return { min: vals[0], max: vals[1] };
}

function hashString(s: string): string {
  // FNV-1a, 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
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
