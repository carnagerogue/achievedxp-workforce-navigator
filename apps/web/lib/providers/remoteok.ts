/**
 * Remote OK provider — remote-friendly postings. Free public API, no auth.
 *
 * Docs/endpoint: https://remoteok.com/api  (returns a JSON array whose FIRST
 * element is a legal/notice object, not a job — we skip it.)
 *
 * Remote OK's API terms ask consumers to attribute the source and link back to
 * the posting. We satisfy both: every job keeps its Remote OK apply URL and is
 * badged "Remote OK" in the UI (sourceName). On by default; disable with
 * REMOTEOK_ENABLED=false.
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const ENDPOINT = 'https://remoteok.com/api';

interface RemoteOkHit {
  id?: string | number;
  slug?: string;
  company?: string;
  position?: string;
  description?: string;
  tags?: string[];
  location?: string;
  date?: string;
  url?: string;
  apply_url?: string;
  salary_min?: number;
  salary_max?: number;
}

export const remoteokProvider: JobProvider = {
  code: 'remoteok',
  name: 'Remote OK',
  enabled() {
    return process.env.REMOTEOK_ENABLED !== 'false';
  },
  async fetch() {
    if (!this.enabled()) return [];
    let rows: RemoteOkHit[];
    try {
      const res = await fetch(ENDPOINT, {
        headers: { Accept: 'application/json', 'User-Agent': 'AchieveDXP/1.0 (+reentry job aggregation)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as RemoteOkHit[];
      rows = Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
    // Skip the leading legal/notice object and any malformed entries.
    return rows.filter((r) => r && r.id != null && r.position && r.company).map(normalize);
  },
};

function normalize(h: RemoteOkHit): JobDto {
  return applyClassification({
    id: `remoteok-${h.id}`,
    title:   h.position ?? '',
    company: h.company ?? 'Unknown employer',
    description: stripHtml(h.description ?? ''),
    descriptionHtml: h.description ?? null,
    applyUrl: h.url ?? h.apply_url ?? (h.slug ? `https://remoteok.com/remote-jobs/${h.slug}` : ''),
    locationCity:       null,
    locationRegion:     null,
    locationPostalCode: null,
    locationCountry:    'US',
    remote:             true,
    employmentType:     'FULL_TIME',
    industry:           h.tags?.[0] ?? null,
    salaryMin:          typeof h.salary_min === 'number' && h.salary_min > 0 ? h.salary_min : null,
    salaryMax:          typeof h.salary_max === 'number' && h.salary_max > 0 ? h.salary_max : null,
    salaryCurrency:     'USD',
    requiredSkills: [],
    requiredCertifications: [],
    minYearsExperience: null,
    postedAt:  h.date ?? null,
    expiresAt: null,
    sourceCode: 'remoteok',
    sourceName: 'Remote OK',
  });
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
