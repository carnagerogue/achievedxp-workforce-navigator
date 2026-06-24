/**
 * Himalayas provider — free public remote-jobs API, no auth.
 *
 * Endpoint: https://himalayas.app/jobs/api?limit=100&offset=0
 * Large remote catalog with strong US coverage. We keep jobs that are open to
 * the US (no location restriction = worldwide, or US explicitly). On by
 * default; disable with HIMALAYAS_ENABLED=false.
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const ENDPOINT = 'https://himalayas.app/jobs/api';

interface HimalayasHit {
  guid?: string;
  title?: string;
  excerpt?: string;
  companyName?: string;
  companySlug?: string;
  employmentType?: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  locationRestrictions?: string[];
  categories?: string[];
  description?: string;
  pubDate?: number | string;
  applicationLink?: string;
}

const US_OK = /\b(united states|usa|u\.s\.|us|north america|americas|worldwide|anywhere|global)\b/i;

export const himalayasProvider: JobProvider = {
  code: 'himalayas',
  name: 'Himalayas',
  enabled() {
    return process.env.HIMALAYAS_ENABLED !== 'false';
  },
  async fetch() {
    if (!this.enabled()) return [];
    const limit = Number(process.env.HIMALAYAS_LIMIT ?? 100);
    try {
      const res = await fetch(`${ENDPOINT}?limit=${limit}&offset=0`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) return [];
      const data = (await res.json()) as { jobs?: HimalayasHit[] };
      const jobs = data.jobs ?? [];
      // Keep US-eligible remote roles (no restriction = open worldwide).
      const usOk = jobs.filter((j) => {
        const r = j.locationRestrictions;
        if (!r || r.length === 0) return true;
        return r.some((x) => US_OK.test(x));
      });
      return usOk.map(normalize);
    } catch {
      return [];
    }
  },
};

function normalize(h: HimalayasHit): JobDto {
  const posted = typeof h.pubDate === 'number' ? new Date(h.pubDate * 1000).toISOString() : (h.pubDate ?? null);
  return applyClassification({
    id: `himalayas-${h.guid ?? Math.random().toString(36).slice(2)}`,
    title:   h.title ?? '',
    company: h.companyName ?? 'Unknown employer',
    description: stripHtml(h.description ?? h.excerpt ?? ''),
    descriptionHtml: h.description ?? null,
    applyUrl: h.applicationLink ?? (h.companySlug ? `https://himalayas.app/companies/${h.companySlug}` : ''),
    locationCity:       null,
    locationRegion:     null,
    locationPostalCode: null,
    locationCountry:    'US',
    remote:             true,
    employmentType:     mapType(h.employmentType),
    industry:           h.categories?.[0] ?? null,
    salaryMin:          typeof h.minSalary === 'number' && h.minSalary > 0 ? h.minSalary : null,
    salaryMax:          typeof h.maxSalary === 'number' && h.maxSalary > 0 ? h.maxSalary : null,
    salaryCurrency:     h.currency || 'USD',
    requiredSkills: [],
    requiredCertifications: [],
    minYearsExperience: null,
    postedAt:  posted,
    expiresAt: null,
    sourceCode: 'himalayas',
    sourceName: 'Himalayas',
  });
}

function mapType(t: string | undefined): JobDto['employmentType'] {
  const l = (t ?? '').toLowerCase();
  if (l.includes('part')) return 'PART_TIME';
  if (l.includes('contract') || l.includes('freelance')) return 'CONTRACT';
  if (l.includes('intern')) return 'INTERNSHIP';
  if (l.includes('temp')) return 'TEMP';
  return 'FULL_TIME';
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
