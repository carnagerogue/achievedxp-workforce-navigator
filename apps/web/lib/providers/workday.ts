/**
 * Workday CXS provider — scans public Workday career sites for a curated
 * list of Fortune 500 fair-chance employers.
 *
 * Workday's "Customer Experience Service" (CXS) endpoint backs the
 * public career-site search UI. It's the same endpoint the candidate-
 * facing site hits when you search a company's careers page. No auth.
 *
 * Pattern:
 *   POST {baseUrl}/jobs
 *   Content-Type: application/json
 *   { "appliedFacets": {}, "limit": 20, "offset": 0, "searchText": "" }
 *
 * Where baseUrl looks like:
 *   https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}
 *
 * The tenant + cluster + site triple is specific to each employer and
 * occasionally migrates. The default list below was verified at time of
 * writing; if a tenant returns 404, the provider silently skips it.
 *
 * The curated list focuses on employers who are public signatories of
 * the Second-Chance Business Coalition or have documented fair-chance
 * hiring practices.
 *
 * Config:
 *   WORKDAY_EMPLOYERS_ENABLED — set to "true" to activate.
 *   WORKDAY_EMPLOYERS         — JSON override of the curated list. Format:
 *                               [{"name":"Walmart","baseUrl":"https://walmart.wd5.myworkdayjobs.com/wday/cxs/walmart/walmart_external"}]
 *   WORKDAY_PAGES             — pages to scan per employer (default 2 = ~40 jobs/employer).
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

interface WorkdayEmployer {
  name: string;
  baseUrl: string;
}

// Curated list of Fortune 500 employers with documented fair-chance
// hiring practices, using Workday as their ATS. Sourced from the
// Second-Chance Business Coalition member list + public verification
// of their career sites.
// Each entry confirmed responding 200 to the public CXS POST as of this
// commit. Workday tenants migrate slugs occasionally; if a tenant starts
// 404'ing or 422'ing, browse the company's public career site, watch
// the network tab for the `/wday/cxs/.../jobs` POST, and copy the new
// baseUrl here.
const DEFAULT_EMPLOYERS: WorkdayEmployer[] = [
  { name: 'JLL',     baseUrl: 'https://jll.wd1.myworkdayjobs.com/wday/cxs/jll/jllcareers' },
  { name: 'Target',  baseUrl: 'https://target.wd5.myworkdayjobs.com/wday/cxs/target/targetcareers' },
  { name: 'Comcast', baseUrl: 'https://comcast.wd5.myworkdayjobs.com/wday/cxs/comcast/Comcast_Careers' },
  { name: 'Dell',    baseUrl: 'https://dell.wd1.myworkdayjobs.com/wday/cxs/dell/External' },
];

interface WorkdayJob {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
  startDate?: string;
}

export const workdayProvider: JobProvider = {
  code: 'workday',
  name: 'Workday Boards',
  enabled() {
    return process.env.WORKDAY_EMPLOYERS_ENABLED === 'true';
  },
  async fetch() {
    if (!this.enabled()) return [];
    const employers = parseEmployers(process.env.WORKDAY_EMPLOYERS) ?? DEFAULT_EMPLOYERS;
    // 5 pages × 20 per page = 100 jobs per employer. With ~4 working
    // tenants by default that's ~400 jobs from Workday. Bump WORKDAY_PAGES
    // if you've added enough custom employers to want more.
    const pages = Number(process.env.WORKDAY_PAGES ?? 5);

    const results = await Promise.allSettled(
      employers.map((e) => fetchEmployer(e, pages)),
    );

    const out: JobDto[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') out.push(...r.value);
    }
    return out;
  },
};

function parseEmployers(raw: string | undefined): WorkdayEmployer[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    return arr.filter((x): x is WorkdayEmployer =>
      !!x && typeof (x as { baseUrl?: unknown }).baseUrl === 'string'
          && typeof (x as { name?: unknown }).name === 'string',
    );
  } catch {
    return null;
  }
}

async function fetchEmployer(e: WorkdayEmployer, pages: number): Promise<JobDto[]> {
  const out: JobDto[] = [];
  const origin = e.baseUrl.replace(/\/wday\/cxs\/.+$/, '');
  for (let p = 0; p < pages; p++) {
    let res;
    try {
      res = await fetch(`${e.baseUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          // Workday rejects bare POSTs without browser-like headers
          // (returns HTTP 422 with empty body). Origin + Referer are
          // the ones that actually matter for CSRF-like checks.
          Origin: origin,
          Referer: `${origin}/`,
          'User-Agent': 'Mozilla/5.0 (compatible; AchieveDXP/1.0)',
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit: 20,
          offset: p * 20,
          searchText: '',
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      break;
    }
    if (!res.ok) break;
    const data = (await res.json().catch(() => ({}))) as { jobPostings?: WorkdayJob[] };
    const jobs = data.jobPostings ?? [];
    if (jobs.length === 0) break;
    for (const j of jobs) out.push(normalize(j, e));
    if (jobs.length < 20) break;
  }
  return out;
}

function normalize(j: WorkdayJob, e: WorkdayEmployer): JobDto {
  const externalPath = j.externalPath ?? '';
  // Apply URL = origin + externalPath. Strip the /wday/cxs/... prefix
  // from baseUrl to get the site origin.
  const origin = e.baseUrl.replace(/\/wday\/cxs\/.+$/, '');
  const applyUrl = externalPath ? `${origin}${externalPath}` : origin;
  const { city, region } = parseLocation(j.locationsText ?? null);
  return applyClassification({
    id: `workday-${slug(e.name)}-${slug(j.title ?? '')}-${slug(externalPath)}`.slice(0, 96),
    title:   j.title ?? '',
    company: e.name,
    description: (j.bulletFields ?? []).join(' • '),
    descriptionHtml: null,
    applyUrl,
    locationCity:       city,
    locationRegion:     region,
    locationPostalCode: null,
    locationCountry:    'US',
    employmentType:     'FULL_TIME',
    industry:           null,
    salaryMin: null, salaryMax: null, salaryCurrency: 'USD',
    requiredSkills: [], requiredCertifications: [], minYearsExperience: null,
    postedAt: j.postedOn ?? j.startDate ?? null, expiresAt: null,
    sourceCode: 'workday', sourceName: 'Workday',
  });
}

function parseLocation(raw: string | null): { city: string | null; region: string | null } {
  if (!raw) return { city: null, region: null };
  if (/remote|virtual|anywhere/i.test(raw)) return { city: 'Remote', region: null };
  // Workday locationsText is often "City, State, Country" or "City, State" or
  // "Multiple Locations" — only try to split on comma if it looks structured.
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const r = parts[1].length === 2 ? parts[1].toUpperCase() : parts[1].split(' ')[0].toUpperCase();
    return { city: parts[0] || null, region: r.length === 2 ? r : null };
  }
  return { city: parts[0] || null, region: null };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
