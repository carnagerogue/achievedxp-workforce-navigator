/**
 * Jooble provider — meta-aggregator (Indeed, Monster, ZipRecruiter,
 * CareerBuilder). Default plan = 500 req/month.
 *
 * Docs: https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation
 * Auth: POST to https://jooble.org/api/{api_key} with JSON body.
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const BASE = 'https://jooble.org/api';
const DEFAULT_KEYWORDS = ['warehouse', 'forklift', 'cdl driver', 'maintenance', 'custodian', 'cook'];

interface JoobleHit {
  id?: string;
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
}

export const joobleProvider: JobProvider = {
  code: 'jooble',
  name: 'Jooble',
  enabled() {
    return !!process.env.JOOBLE_API_KEY;
  },
  async fetch() {
    if (!this.enabled()) return [];
    const apiKey = process.env.JOOBLE_API_KEY!;
    const keywords = (process.env.JOOBLE_KEYWORDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_KEYWORDS);
    const locations = (process.env.JOOBLE_LOCATIONS?.split(',').map((s) => s.trim()).filter(Boolean) ?? ['United States']);
    const maxPages = Number(process.env.JOOBLE_MAX_PAGES ?? 1);
    const resultsPerPage = Number(process.env.JOOBLE_RESULTS_PER_PAGE ?? 20);
    const radiusKm = Number(process.env.JOOBLE_RADIUS_KM ?? 40);
    const url = `${BASE}/${apiKey}`;

    const out: JobDto[] = [];
    for (const kw of keywords) {
      for (const loc of locations) {
        for (let page = 1; page <= maxPages; page++) {
          let hits: JoobleHit[];
          try {
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ keywords: kw, location: loc, page, ResultOnPage: resultsPerPage, radius: radiusKm }),
              signal: AbortSignal.timeout(15000),
            });
            if (!res.ok) break;
            const data = (await res.json()) as { jobs?: JoobleHit[] };
            hits = data.jobs ?? [];
          } catch {
            break;
          }
          if (hits.length === 0) break;
          for (const h of hits) out.push(normalize(h));
          if (hits.length < resultsPerPage) break;
        }
      }
    }
    return dedupeBy(out, (j) => j.id);
  },
};

function normalize(h: JoobleHit): JobDto {
  const id = `jooble-${h.id ?? Math.random().toString(36).slice(2)}`;
  const { city, region } = parseLocation(h.location);
  return applyClassification({
    id,
    title:   h.title ?? '',
    company: h.company ?? h.source ?? 'Unknown employer',
    description: h.snippet ?? '',
    descriptionHtml: null,
    applyUrl: h.link ?? '',
    locationCity:       city,
    locationRegion:     region,
    locationPostalCode: null,
    locationCountry:    'US',
    employmentType:     mapEmployment(h.type),
    industry:           null,
    salaryMin:          null,
    salaryMax:          null,
    salaryCurrency:     'USD',
    requiredSkills: [],
    requiredCertifications: [],
    minYearsExperience: null,
    postedAt:  h.updated ?? null,
    expiresAt: null,
    sourceCode: 'jooble',
    sourceName: 'Jooble',
  });
}

function parseLocation(loc: string | undefined): { city: string | null; region: string | null } {
  if (!loc) return { city: null, region: null };
  // Jooble formats locations as "City, ST" or "City, State Country".
  const parts = loc.split(',').map((s) => s.trim());
  if (parts.length >= 2) {
    const region = parts[1].length === 2 ? parts[1].toUpperCase() : parts[1].split(' ')[0];
    return { city: parts[0] || null, region: region || null };
  }
  return { city: parts[0] || null, region: null };
}

function mapEmployment(t: string | undefined): JobDto['employmentType'] {
  if (!t) return 'FULL_TIME';
  const lower = t.toLowerCase();
  if (lower.includes('part')) return 'PART_TIME';
  if (lower.includes('contract')) return 'CONTRACT';
  if (lower.includes('temp')) return 'TEMP';
  if (lower.includes('intern')) return 'INTERNSHIP';
  return 'FULL_TIME';
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
