/**
 * Remotive provider — remote-friendly postings. No auth required.
 *
 * Docs: https://remotive.com/api/remote-jobs
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const ENDPOINT = 'https://remotive.com/api/remote-jobs';

interface RemotiveHit {
  id?: number;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

export const remotiveProvider: JobProvider = {
  code: 'remotive',
  name: 'Remotive',
  enabled() {
    // Remotive's free API has no auth. Default to disabled so a fresh
    // deploy without intent doesn't suddenly start ingesting; flip with
    // REMOTIVE_ENABLED=true.
    return process.env.REMOTIVE_ENABLED === 'true';
  },
  async fetch() {
    if (!this.enabled()) return [];
    const limit = Number(process.env.REMOTIVE_LIMIT ?? 100);
    const url = new URL(ENDPOINT);
    url.searchParams.set('limit', String(limit));
    if (process.env.REMOTIVE_CATEGORY) {
      url.searchParams.set('category', process.env.REMOTIVE_CATEGORY);
    }
    let hits: RemotiveHit[];
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { jobs?: RemotiveHit[] };
      hits = data.jobs ?? [];
    } catch {
      return [];
    }
    const usOnly = process.env.REMOTIVE_US_ONLY !== 'false';
    if (usOnly) {
      hits = hits.filter((h) =>
        !h.candidate_required_location ||
        /\b(usa|united states|us only|worldwide|anywhere|north america)\b/i.test(h.candidate_required_location ?? ''),
      );
    }
    return hits.map(normalize);
  },
};

function normalize(h: RemotiveHit): JobDto {
  const id = `remotive-${h.id ?? Math.random().toString(36).slice(2)}`;
  return applyClassification({
    id,
    title:   h.title ?? '',
    company: h.company_name ?? 'Unknown employer',
    description: stripHtml(h.description ?? ''),
    descriptionHtml: h.description ?? null,
    applyUrl: h.url ?? '',
    locationCity:       null,
    locationRegion:     null,
    locationPostalCode: null,
    locationCountry:    'US',
    remote:             true,
    employmentType:     mapEmployment(h.job_type),
    industry:           h.category ?? null,
    salaryMin:          null,
    salaryMax:          null,
    salaryCurrency:     'USD',
    requiredSkills: [],
    requiredCertifications: [],
    minYearsExperience: null,
    postedAt:  h.publication_date ?? null,
    expiresAt: null,
    sourceCode: 'remotive',
    sourceName: 'Remotive',
  });
}

function mapEmployment(t: string | undefined): JobDto['employmentType'] {
  switch ((t ?? '').toLowerCase()) {
    case 'part_time': return 'PART_TIME';
    case 'contract': return 'CONTRACT';
    case 'internship': return 'INTERNSHIP';
    default: return 'FULL_TIME';
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
