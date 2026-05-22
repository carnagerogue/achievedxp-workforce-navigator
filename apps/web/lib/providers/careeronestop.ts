/**
 * CareerOneStop NLX provider — pulls National Labor Exchange listings
 * via the U.S. Department of Labor's CareerOneStop API.
 *
 * NLX is a free, government-operated job exchange — direct-employer
 * postings + state workforce agency feeds. Roughly 1-2M live listings
 * at any given time, mission-aligned with your fair-chance focus
 * (state workforce agencies surface a lot of accessible roles).
 *
 * Auth:
 *   COS_USER_ID — your registered CareerOneStop user id
 *   COS_TOKEN   — bearer token
 * Both already exist on the api Railway service from the original
 * NestJS deploy. On the web service, set them as reference variables:
 *   COS_USER_ID = ${{api.COS_USER_ID}}
 *   COS_TOKEN   = ${{api.COS_TOKEN}}
 *
 * Optional config:
 *   COS_KEYWORDS — comma-separated, default fair-chance industry mix
 *   COS_LOCATION — default "US" (national)
 *   COS_RADIUS   — default 50 (miles)
 *   COS_POSTED_DAYS — default 30
 *   COS_LIMIT    — per-search cap, default 50 (max 100)
 *
 * Endpoint:
 *   GET /v1/jobsearch/{userId}/{kw}/{loc}/{radius}/{postedDays}/Distance/asc/0/{limit}/false
 *   Authorization: Bearer {COS_TOKEN}
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

const BASE = 'https://api.careeronestop.org/v1';
const DEFAULT_KEYWORDS = ['warehouse', 'forklift', 'cdl driver', 'maintenance', 'custodian', 'cook', 'laborer', 'manufacturing'];

interface CosJob {
  JvId?: string;
  JobID?: string;
  JobTitle?: string;
  Company?: string;
  CompanyName?: string;
  Location?: string;
  City?: string;
  State?: string;
  ZipCode?: string;
  PostedDate?: string;
  DatePosted?: string;
  Url?: string;
  JobUrl?: string;
  ApplyUrl?: string;
  Description?: string;
  JobDescription?: string;
  Salary?: string;
  EmploymentType?: string;
}

export const careerOneStopProvider: JobProvider = {
  code: 'careeronestop',
  name: 'CareerOneStop NLX',
  enabled() {
    return !!(process.env.COS_USER_ID && process.env.COS_TOKEN);
  },
  async fetch() {
    if (!this.enabled()) return [];
    const userId = process.env.COS_USER_ID!;
    const token = process.env.COS_TOKEN!;
    const keywords = (process.env.COS_KEYWORDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_KEYWORDS);
    const location = encodeSeg(process.env.COS_LOCATION ?? 'US');
    const radius = Number(process.env.COS_RADIUS ?? 50);
    const postedDays = Number(process.env.COS_POSTED_DAYS ?? 30);
    const limit = Math.min(Number(process.env.COS_LIMIT ?? 50), 100);

    const out: JobDto[] = [];
    for (const kw of keywords) {
      const k = encodeSeg(kw);
      const path = `/jobsearch/${encodeSeg(userId)}/${k}/${location}/${radius}/${postedDays}/Distance/asc/0/${limit}/false`;
      let data: unknown;
      try {
        const res = await fetch(`${BASE}${path}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) continue;
        data = await res.json();
      } catch {
        continue;
      }
      const jobs = extractJobs(data);
      for (const j of jobs) {
        const normalized = normalize(j);
        if (normalized.title && normalized.applyUrl) out.push(normalized);
      }
    }
    return dedupeBy(out, (j) => j.id);
  },
};

/**
 * CareerOneStop returns the job list under a couple of different keys
 * depending on the search variant (Jobs vs JobsList vs results). Walk
 * the known options.
 */
function extractJobs(data: unknown): CosJob[] {
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  for (const key of ['Jobs', 'JobList', 'JobsList', 'Listings', 'results', 'items']) {
    const v = obj[key];
    if (Array.isArray(v)) return v as CosJob[];
  }
  // Some responses wrap as { data: { Jobs: [...] } }
  const nested = (obj.data as Record<string, unknown> | undefined);
  if (nested) {
    for (const key of ['Jobs', 'JobList', 'JobsList', 'Listings']) {
      const v = nested[key];
      if (Array.isArray(v)) return v as CosJob[];
    }
  }
  return [];
}

function normalize(j: CosJob): JobDto {
  const id = `cos-${j.JvId ?? j.JobID ?? hash([j.JobTitle, j.Company, j.City, j.State].join('|'))}`;
  const title = j.JobTitle ?? '';
  const company = j.Company ?? j.CompanyName ?? 'Unknown employer';
  const description = j.Description ?? j.JobDescription ?? '';
  const applyUrl = j.ApplyUrl ?? j.JobUrl ?? j.Url ?? '';
  const { city, region } = parseLocation(j);
  const postedAt = j.PostedDate ?? j.DatePosted ?? null;
  return applyClassification({
    id,
    title,
    company,
    description,
    descriptionHtml: null,
    applyUrl,
    locationCity:       city,
    locationRegion:     region,
    locationPostalCode: j.ZipCode ?? null,
    locationCountry:    'US',
    employmentType:     mapEmployment(j.EmploymentType),
    industry:           null,
    salaryMin: null, salaryMax: null, salaryCurrency: 'USD',
    requiredSkills: [], requiredCertifications: [], minYearsExperience: null,
    postedAt, expiresAt: null,
    sourceCode: 'careeronestop', sourceName: 'CareerOneStop NLX',
  });
}

function parseLocation(j: CosJob): { city: string | null; region: string | null } {
  if (j.City || j.State) {
    return { city: j.City ?? null, region: j.State ?? null };
  }
  if (!j.Location) return { city: null, region: null };
  const parts = j.Location.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    const r = parts[1].length === 2 ? parts[1].toUpperCase() : parts[1].slice(0, 2).toUpperCase();
    return { city: parts[0] || null, region: r };
  }
  return { city: parts[0] || null, region: null };
}

function mapEmployment(t: string | undefined): JobDto['employmentType'] {
  if (!t) return 'FULL_TIME';
  const l = t.toLowerCase();
  if (l.includes('part')) return 'PART_TIME';
  if (l.includes('contract')) return 'CONTRACT';
  if (l.includes('intern')) return 'INTERNSHIP';
  if (l.includes('temp')) return 'TEMP';
  return 'FULL_TIME';
}

function encodeSeg(s: string): string {
  // CareerOneStop's path segments need URL-encoding but they also have
  // a quirk where '/' inside a segment breaks routing; we replace with
  // space then encode.
  return encodeURIComponent(s.replace(/\//g, ' '));
}

function hash(s: string): string {
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
