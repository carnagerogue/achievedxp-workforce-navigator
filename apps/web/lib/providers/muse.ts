/**
 * The Muse provider — free public jobs API, no auth required.
 *
 * Docs: https://www.themuse.com/developers/api/v2
 *
 * Surfaces ~30k tech and mid-size company postings. Less direct overlap
 * with fair-chance jobs than Adzuna/Jooble, but useful for the
 * "remote-friendly office work" segment that complements blue-collar
 * roles aggregators emphasize.
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const BASE = 'https://www.themuse.com/api/public/jobs';

interface MuseHit {
  id?: number;
  name?: string;
  contents?: string;
  type?: string;
  publication_date?: string;
  refs?: { landing_page?: string };
  company?: { name?: string };
  locations?: Array<{ name?: string }>;
  categories?: Array<{ name?: string }>;
  levels?: Array<{ name?: string }>;
}

export const museProvider: JobProvider = {
  code: 'muse',
  name: 'The Muse',
  enabled() {
    // Free public API. Default off so it isn't called unless intent is
    // explicit; flip with MUSE_ENABLED=true. (Same convention as Remotive.)
    return process.env.MUSE_ENABLED === 'true';
  },
  async fetch() {
    if (!this.enabled()) return [];
    const maxPages = Number(process.env.MUSE_MAX_PAGES ?? 2);
    const category = process.env.MUSE_CATEGORY;
    const level = process.env.MUSE_LEVEL;
    const locationFilter = process.env.MUSE_LOCATION;

    const out: JobDto[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const url = new URL(BASE);
      url.searchParams.set('page', String(page));
      url.searchParams.set('descending', 'true');
      if (category) url.searchParams.set('category', category);
      if (level) url.searchParams.set('level', level);
      if (locationFilter) url.searchParams.set('location', locationFilter);
      let hits: MuseHit[];
      try {
        const res = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) break;
        const data = (await res.json()) as { results?: MuseHit[] };
        hits = data.results ?? [];
      } catch {
        break;
      }
      if (hits.length === 0) break;
      for (const h of hits) out.push(normalize(h));
    }
    return dedupeBy(out, (j) => j.id);
  },
};

function normalize(h: MuseHit): JobDto {
  const id = `muse-${h.id ?? Math.random().toString(36).slice(2)}`;
  const locName = h.locations?.[0]?.name ?? null;
  const { city, region } = parseLocation(locName);
  const remote = locName ? /flexible|remote/i.test(locName) : false;
  return applyClassification({
    id,
    title:   h.name ?? '',
    company: h.company?.name ?? 'Unknown employer',
    description: stripHtml(h.contents ?? ''),
    descriptionHtml: h.contents ?? null,
    applyUrl: h.refs?.landing_page ?? '',
    locationCity:       city,
    locationRegion:     region,
    locationPostalCode: null,
    locationCountry:    'US',
    remote,
    employmentType:     mapEmployment(h.type),
    industry:           h.categories?.[0]?.name?.toLowerCase().replace(/\s+/g, '_') ?? null,
    salaryMin:          null,
    salaryMax:          null,
    salaryCurrency:     'USD',
    requiredSkills: [],
    requiredCertifications: [],
    minYearsExperience: null,
    postedAt:  h.publication_date ?? null,
    expiresAt: null,
    sourceCode: 'muse',
    sourceName: 'The Muse',
  });
}

function parseLocation(s: string | null): { city: string | null; region: string | null } {
  if (!s) return { city: null, region: null };
  if (/flexible|remote/i.test(s)) return { city: 'Remote', region: null };
  const parts = s.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    const region = parts[1].length === 2 ? parts[1].toUpperCase() : parts[1].slice(0, 2).toUpperCase();
    return { city: parts[0] || null, region };
  }
  return { city: parts[0] || null, region: null };
}

function mapEmployment(t: string | undefined): JobDto['employmentType'] {
  if (!t) return 'FULL_TIME';
  const l = t.toLowerCase();
  if (l.includes('part')) return 'PART_TIME';
  if (l.includes('contract') || l.includes('freelance')) return 'CONTRACT';
  if (l.includes('intern')) return 'INTERNSHIP';
  if (l.includes('temp')) return 'TEMP';
  return 'FULL_TIME';
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
