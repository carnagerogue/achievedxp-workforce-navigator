/**
 * Jobicy provider — free public remote-jobs API, no auth.
 *
 * Endpoint: https://jobicy.com/api/v2/remote-jobs?count=50&geo=usa
 * We request geo=usa so results are US-eligible. Jobicy's fair-use terms ask
 * for a link-back + "Jobicy" attribution (satisfied via apply URL + source
 * badge) and a modest call rate (covered by the 10-min ingest cache). On by
 * default; disable with JOBICY_ENABLED=false.
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const ENDPOINT = 'https://jobicy.com/api/v2/remote-jobs';

interface JobicyHit {
  id?: number | string;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  jobIndustry?: string | string[];
  jobType?: string | string[];
  jobGeo?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
}

export const jobicyProvider: JobProvider = {
  code: 'jobicy',
  name: 'Jobicy',
  enabled() {
    return process.env.JOBICY_ENABLED !== 'false';
  },
  async fetch() {
    if (!this.enabled()) return [];
    const count = Number(process.env.JOBICY_COUNT ?? 50);
    const url = `${ENDPOINT}?count=${count}&geo=usa`;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) return [];
      const data = (await res.json()) as { jobs?: JobicyHit[] };
      return (data.jobs ?? []).map(normalize);
    } catch {
      return [];
    }
  },
};

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

function normalize(h: JobicyHit): JobDto {
  return applyClassification({
    id: `jobicy-${h.id ?? Math.random().toString(36).slice(2)}`,
    title:   h.jobTitle ?? '',
    company: h.companyName ?? 'Unknown employer',
    description: stripHtml(h.jobDescription ?? h.jobExcerpt ?? ''),
    descriptionHtml: h.jobDescription ?? null,
    applyUrl: h.url ?? '',
    locationCity:       null,
    locationRegion:     null,
    locationPostalCode: null,
    locationCountry:    'US',
    remote:             true,
    employmentType:     mapType(first(h.jobType)),
    industry:           first(h.jobIndustry) ?? null,
    salaryMin:          typeof h.salaryMin === 'number' && h.salaryMin > 0 ? h.salaryMin : null,
    salaryMax:          typeof h.salaryMax === 'number' && h.salaryMax > 0 ? h.salaryMax : null,
    salaryCurrency:     h.salaryCurrency || 'USD',
    requiredSkills: [],
    requiredCertifications: [],
    minYearsExperience: null,
    postedAt:  h.pubDate ?? null,
    expiresAt: null,
    sourceCode: 'jobicy',
    sourceName: 'Jobicy',
  });
}

function mapType(t: string | undefined): JobDto['employmentType'] {
  const l = (t ?? '').toLowerCase();
  if (l.includes('part')) return 'PART_TIME';
  if (l.includes('contract')) return 'CONTRACT';
  if (l.includes('intern')) return 'INTERNSHIP';
  return 'FULL_TIME';
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
