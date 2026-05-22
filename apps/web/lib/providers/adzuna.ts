/**
 * Adzuna provider — meta-aggregator (includes Indeed, Monster,
 * ZipRecruiter, and many state job boards). Free tier ≈1000 calls/mo.
 *
 * Docs: https://developer.adzuna.com/overview
 * Auth: ADZUNA_APP_ID + ADZUNA_APP_KEY.
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const BASE = 'https://api.adzuna.com/v1/api/jobs';
const DEFAULT_KEYWORDS = ['warehouse', 'forklift', 'cdl', 'cook', 'custodian'];

interface AdzunaHit {
  id?: string | number;
  title?: string;
  company?: { display_name?: string };
  description?: string;
  redirect_url?: string;
  location?: { area?: string[]; display_name?: string };
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
  created?: string;
  category?: { label?: string; tag?: string };
}

export const adzunaProvider: JobProvider = {
  code: 'adzuna',
  name: 'Adzuna',
  enabled() {
    return !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
  },
  async fetch() {
    if (!this.enabled()) return [];
    const appId = process.env.ADZUNA_APP_ID!;
    const appKey = process.env.ADZUNA_APP_KEY!;
    const country = (process.env.ADZUNA_COUNTRY ?? 'us').toLowerCase();
    const keywords = (process.env.ADZUNA_KEYWORDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_KEYWORDS);
    const maxPages = Number(process.env.ADZUNA_MAX_PAGES ?? 1);
    const where = process.env.ADZUNA_WHERE ?? '';

    const out: JobDto[] = [];
    for (const kw of keywords) {
      for (let page = 1; page <= maxPages; page++) {
        const url = new URL(`${BASE}/${country}/search/${page}`);
        url.searchParams.set('app_id', appId);
        url.searchParams.set('app_key', appKey);
        url.searchParams.set('results_per_page', '50');
        url.searchParams.set('what', kw);
        if (where) url.searchParams.set('where', where);
        let hits: AdzunaHit[];
        try {
          const res = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(15000),
          });
          if (!res.ok) break;
          const data = (await res.json()) as { results?: AdzunaHit[] };
          hits = data.results ?? [];
        } catch {
          break;
        }
        if (hits.length === 0) break;
        for (const h of hits) out.push(normalize(h));
        if (hits.length < 50) break;
      }
    }
    return dedupeBy(out, (j) => j.id);
  },
};

function normalize(h: AdzunaHit): JobDto {
  const area = h.location?.area ?? [];
  const region = area.length > 1 ? area[1] : null;
  const city = area.length > 2 ? area[area.length - 1] : h.location?.display_name ?? null;
  const id = `adzuna-${h.id ?? Math.random().toString(36).slice(2)}`;
  return applyClassification({
    id,
    title:   h.title ?? '',
    company: h.company?.display_name ?? 'Unknown employer',
    description: h.description ?? '',
    descriptionHtml: null,
    applyUrl: h.redirect_url ?? '',
    locationCity:       city,
    locationRegion:     normalizeUsRegion(region),
    locationPostalCode: null,
    locationCountry:    'US',
    employmentType:     mapEmployment(h.contract_time, h.contract_type),
    industry:           h.category?.tag ?? null,
    salaryMin:          h.salary_min ? Math.round(h.salary_min) : null,
    salaryMax:          h.salary_max ? Math.round(h.salary_max) : null,
    salaryCurrency:     'USD',
    requiredSkills: [],
    requiredCertifications: [],
    minYearsExperience: null,
    postedAt:  h.created ?? null,
    expiresAt: null,
    sourceCode: 'adzuna',
    sourceName: 'Adzuna',
  });
}

function mapEmployment(time: string | undefined, type: string | undefined): JobDto['employmentType'] {
  if (time === 'part_time') return 'PART_TIME';
  if (type === 'contract') return 'CONTRACT';
  return 'FULL_TIME';
}

const US_STATE_NAMES: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};

function normalizeUsRegion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.length === 2) return raw.toUpperCase();
  return US_STATE_NAMES[raw] ?? raw;
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
