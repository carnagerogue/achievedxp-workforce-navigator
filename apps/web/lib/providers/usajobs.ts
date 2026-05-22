/**
 * USAJobs provider — federal civilian openings.
 *
 * Docs: https://developer.usajobs.gov/API-Reference/GET-api-Search
 * Auth: USAJOBS_API_KEY + USAJOBS_USER_AGENT (your registered email).
 *
 * The classifier defaults federal-employer postings to HIGH risk +
 * excludesFelons=true (OPM 5 CFR 731 suitability). That's the truth-in-
 * product call we want, even though USAJobs surfaces a lot of civilian
 * roles that *could* in principle hire fair-chance candidates.
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const BASE = 'https://data.usajobs.gov/api/search';
const DEFAULT_KEYWORDS = ['warehouse', 'forklift', 'maintenance', 'custodian', 'cook', 'driver', 'clerk', 'laborer'];

interface UsajobsHit {
  MatchedObjectId?: string;
  MatchedObjectDescriptor?: {
    PositionID?: string;
    PositionTitle?: string;
    OrganizationName?: string;
    DepartmentName?: string;
    ApplyURI?: string[];
    PositionRemuneration?: Array<{ MinimumRange?: string; MaximumRange?: string; RateIntervalCode?: string }>;
    PositionLocation?: Array<{ LocationName?: string; CityName?: string; CountrySubDivisionCode?: string; CountryCode?: string }>;
    PositionStartDate?: string;
    PositionEndDate?: string;
    UserArea?: { Details?: { JobSummary?: string } };
  };
}

export const usajobsProvider: JobProvider = {
  code: 'usajobs',
  name: 'USAJobs',
  enabled() {
    return !!(process.env.USAJOBS_API_KEY && process.env.USAJOBS_USER_AGENT);
  },
  async fetch() {
    if (!this.enabled()) return [];
    const apiKey = process.env.USAJOBS_API_KEY!;
    const ua = process.env.USAJOBS_USER_AGENT!;
    const keywords = (process.env.USAJOBS_KEYWORDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_KEYWORDS);
    const maxPages = Number(process.env.USAJOBS_MAX_PAGES ?? 2);

    const out: JobDto[] = [];
    for (const kw of keywords) {
      for (let page = 1; page <= maxPages; page++) {
        const url = new URL(BASE);
        url.searchParams.set('Keyword', kw);
        url.searchParams.set('ResultsPerPage', '50');
        url.searchParams.set('Page', String(page));
        let hits: UsajobsHit[];
        try {
          const res = await fetch(url.toString(), {
            headers: {
              'Authorization-Key': apiKey,
              'User-Agent': ua,
              Host: 'data.usajobs.gov',
              Accept: 'application/json',
            },
            // Keep individual requests bounded so a slow provider doesn't
            // hang the whole /api/v1/jobs handler.
            signal: AbortSignal.timeout(15000),
          });
          if (!res.ok) break;
          const data = (await res.json()) as { SearchResult?: { SearchResultItems?: UsajobsHit[] } };
          hits = data.SearchResult?.SearchResultItems ?? [];
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

function normalize(h: UsajobsHit): JobDto {
  const d = h.MatchedObjectDescriptor ?? {};
  const loc = d.PositionLocation?.[0] ?? {};
  const pay = d.PositionRemuneration?.[0];
  const id = `usajobs-${h.MatchedObjectId ?? d.PositionID ?? Math.random().toString(36).slice(2)}`;
  const title = d.PositionTitle ?? '';
  const desc = d.UserArea?.Details?.JobSummary ?? '';
  return applyClassification({
    id,
    title,
    company: d.OrganizationName ?? d.DepartmentName ?? 'U.S. Government',
    description: desc,
    descriptionHtml: null,
    applyUrl: d.ApplyURI?.[0] ?? `https://www.usajobs.gov/job/${h.MatchedObjectId}`,
    locationCity:       loc.CityName ?? null,
    locationRegion:     loc.CountrySubDivisionCode ?? null,
    locationPostalCode: null,
    locationCountry:    loc.CountryCode ?? 'US',
    employmentType:     'FULL_TIME',
    industry:           null,
    salaryMin:          pay?.MinimumRange ? Number(pay.MinimumRange) : null,
    salaryMax:          pay?.MaximumRange ? Number(pay.MaximumRange) : null,
    salaryCurrency:     'USD',
    requiredSkills: [],
    requiredCertifications: [],
    minYearsExperience: null,
    postedAt:  d.PositionStartDate ?? null,
    expiresAt: d.PositionEndDate ?? null,
    sourceCode: 'usajobs',
    sourceName: 'USAJobs',
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
