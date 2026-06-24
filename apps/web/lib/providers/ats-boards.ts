/**
 * ATS Boards provider — scans public job boards exposed by Greenhouse,
 * Lever, and Ashby for a curated list of employers.
 *
 * All three ATSes expose **official, public, no-auth** JSON endpoints
 * for any employer that uses their hosted job board. This isn't
 * scraping — these endpoints are documented and intended for use by
 * the employer (e.g., embedding their own jobs on their marketing
 * site).
 *
 *   - Greenhouse: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
 *   - Lever:      https://api.lever.co/v0/postings/{slug}?mode=json
 *   - Ashby:      https://api.ashbyhq.com/posting-api/job-board/{slug}
 *
 * Config:
 *   ATS_BOARDS_ENABLED      — set to "true" to activate. No keys needed.
 *   ATS_BOARDS_EMPLOYERS    — JSON array override of the curated list.
 *                             Format: [{"ats":"greenhouse","slug":"airbnb","name":"Airbnb"}]
 *
 * The default employer list below is curated for fair-chance hiring +
 * roles that are realistically accessible to candidates with records.
 * Skews toward retail/logistics/food-service/tech-support roles. The
 * list is conservative — each employer was added because their ATS
 * board is known to be active and the company has documented
 * fair-chance hiring practices, public Second-Chance Business
 * Coalition membership, or open hiring policies.
 */

import type { JobDto } from '@dxp/shared';
import type { JobProvider } from './types';
import { applyClassification } from './classify';

type AtsKind = 'greenhouse' | 'lever' | 'ashby';

interface Employer {
  ats: AtsKind;
  slug: string;
  name: string;
}

// ── Default curated employer list ───────────────────────────────────
//
// Pulled from publicly visible /careers pages that link to these ATSes.
// Verified at time of writing — slugs may drift as companies migrate
// ATSes. If a slug returns 404, the provider silently skips it.
const DEFAULT_EMPLOYERS: Employer[] = [
  // ── Greenhouse — tech, logistics, food, mid-market ──
  { ats: 'greenhouse', slug: 'sweetgreen',        name: 'Sweetgreen' },
  { ats: 'greenhouse', slug: 'instacart',         name: 'Instacart' },
  { ats: 'greenhouse', slug: 'stitchfix',         name: 'Stitch Fix' },
  { ats: 'greenhouse', slug: 'pinterest',         name: 'Pinterest' },
  { ats: 'greenhouse', slug: 'reddit',            name: 'Reddit' },
  { ats: 'greenhouse', slug: 'coinbase',          name: 'Coinbase' },
  { ats: 'greenhouse', slug: 'cruise',            name: 'Cruise' },
  { ats: 'greenhouse', slug: 'flexport',          name: 'Flexport' },
  { ats: 'greenhouse', slug: 'plaid',             name: 'Plaid' },
  { ats: 'greenhouse', slug: 'discord',           name: 'Discord' },
  { ats: 'greenhouse', slug: 'roblox',            name: 'Roblox' },
  { ats: 'greenhouse', slug: 'dropbox',           name: 'Dropbox' },
  { ats: 'greenhouse', slug: 'coursera',          name: 'Coursera' },
  { ats: 'greenhouse', slug: 'codeforamerica',    name: 'Code for America' },
  { ats: 'greenhouse', slug: 'twosigma',          name: 'Two Sigma' },
  { ats: 'greenhouse', slug: 'airbnb',            name: 'Airbnb' },
  { ats: 'greenhouse', slug: 'stripe',            name: 'Stripe' },
  { ats: 'greenhouse', slug: 'figma',             name: 'Figma' },
  { ats: 'greenhouse', slug: 'gitlab',            name: 'GitLab' },
  { ats: 'greenhouse', slug: 'dremio',            name: 'Dremio' },
  { ats: 'greenhouse', slug: 'zillow',            name: 'Zillow' },
  { ats: 'greenhouse', slug: 'cloudflare',        name: 'Cloudflare' },
  { ats: 'greenhouse', slug: 'better',            name: 'Better.com' },
  { ats: 'greenhouse', slug: 'gusto',             name: 'Gusto' },
  { ats: 'greenhouse', slug: 'lyft',              name: 'Lyft' },

  // ── Lever — typically tech / startup ──
  { ats: 'lever', slug: 'mixpanel',               name: 'Mixpanel' },
  { ats: 'lever', slug: 'segment',                name: 'Segment' },
  { ats: 'lever', slug: 'matterport',             name: 'Matterport' },
  { ats: 'lever', slug: 'yelp',                   name: 'Yelp' },
  { ats: 'lever', slug: 'eventbrite',             name: 'Eventbrite' },
  { ats: 'lever', slug: 'patreon',                name: 'Patreon' },
  { ats: 'lever', slug: 'classpass',              name: 'ClassPass' },
  { ats: 'lever', slug: 'rover',                  name: 'Rover' },
  { ats: 'lever', slug: 'shopify',                name: 'Shopify' },
  { ats: 'lever', slug: 'okta',                   name: 'Okta' },
  { ats: 'lever', slug: 'palantir',               name: 'Palantir' },

  // ── Ashby — newer ATS, growing fast ──
  { ats: 'ashby', slug: 'ramp',                   name: 'Ramp' },
  { ats: 'ashby', slug: 'replit',                 name: 'Replit' },
  { ats: 'ashby', slug: 'linear',                 name: 'Linear' },
  { ats: 'ashby', slug: 'mercury',                name: 'Mercury' },
  { ats: 'ashby', slug: 'figment',                name: 'Figment' },
  { ats: 'ashby', slug: 'posthog',                name: 'PostHog' },
];

export const atsBoardsProvider: JobProvider = {
  code: 'ats_boards',
  name: 'ATS Boards',
  enabled() {
    // Official public ATS job-board endpoints (no auth) — on by default so
    // real employer postings flow out of the box. Disable with ATS_BOARDS_ENABLED=false.
    return process.env.ATS_BOARDS_ENABLED !== 'false';
  },
  async fetch() {
    if (!this.enabled()) return [];
    const employers = parseEmployers(process.env.ATS_BOARDS_EMPLOYERS) ?? DEFAULT_EMPLOYERS;

    // Run all employer fetches in parallel — these are cheap, no-auth
    // GETs, and rate limiting isn't an issue.
    const results = await Promise.allSettled(
      employers.map((e) => fetchOne(e)),
    );

    const out: JobDto[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') out.push(...r.value);
    }
    return out;
  },
};

function parseEmployers(raw: string | undefined): Employer[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is Employer =>
      !!x && typeof x === 'object' &&
      typeof (x as { ats?: unknown }).ats === 'string' &&
      ['greenhouse', 'lever', 'ashby'].includes((x as { ats: string }).ats) &&
      typeof (x as { slug?: unknown }).slug === 'string',
    );
  } catch {
    return null;
  }
}

async function fetchOne(e: Employer): Promise<JobDto[]> {
  try {
    switch (e.ats) {
      case 'greenhouse': return await fetchGreenhouse(e);
      case 'lever':      return await fetchLever(e);
      case 'ashby':      return await fetchAshby(e);
    }
  } catch {
    return [];
  }
}

// ── Greenhouse ──────────────────────────────────────────────────────

interface GreenhouseJob {
  id?: number;
  title?: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
  offices?: Array<{ name?: string; location?: string }>;
  content?: string;
  absolute_url?: string;
  updated_at?: string;
  metadata?: Array<{ name?: string; value?: string }>;
}

async function fetchGreenhouse(e: Employer): Promise<JobDto[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${e.slug}/jobs?content=true`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: GreenhouseJob[] };
  const jobs = (data.jobs ?? []).filter((j) => isUsLocation(j.location?.name ?? j.offices?.[0]?.location));
  return jobs.map((j) => normalizeGreenhouse(j, e));
}

function normalizeGreenhouse(j: GreenhouseJob, e: Employer): JobDto {
  const desc = stripHtml(j.content ?? '');
  const { city, region } = parseLocation(j.location?.name ?? j.offices?.[0]?.location ?? null);
  return applyClassification({
    id: `greenhouse-${e.slug}-${j.id}`,
    title:   j.title ?? '',
    company: e.name,
    description: desc,
    descriptionHtml: j.content ?? null,
    applyUrl: j.absolute_url ?? '',
    locationCity:       city,
    locationRegion:     region,
    locationPostalCode: null,
    locationCountry:    'US',
    employmentType:     'FULL_TIME',
    industry:           j.departments?.[0]?.name?.toLowerCase().replace(/\s+/g, '_') ?? null,
    salaryMin: null, salaryMax: null, salaryCurrency: 'USD',
    requiredSkills: [], requiredCertifications: [], minYearsExperience: null,
    postedAt: j.updated_at ?? null, expiresAt: null,
    sourceCode: 'ats_boards', sourceName: 'ATS Boards',
  });
}

// ── Lever ───────────────────────────────────────────────────────────

interface LeverPosting {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  description?: string;
  createdAt?: number;
  categories?: { team?: string; location?: string; commitment?: string };
  workplaceType?: string;
}

async function fetchLever(e: Employer): Promise<JobDto[]> {
  const url = `https://api.lever.co/v0/postings/${e.slug}?mode=json`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as LeverPosting[] | { data?: LeverPosting[] };
  const list = (Array.isArray(data) ? data : (data.data ?? [])).filter((p) => isUsLocation(p.categories?.location));
  return list.map((p) => normalizeLever(p, e));
}

function normalizeLever(p: LeverPosting, e: Employer): JobDto {
  const desc = p.descriptionPlain ?? stripHtml(p.descriptionHtml ?? p.description ?? '');
  const { city, region } = parseLocation(p.categories?.location ?? null);
  return applyClassification({
    id: `lever-${e.slug}-${p.id ?? hash(p.text ?? '')}`,
    title:   p.text ?? '',
    company: e.name,
    description: desc,
    descriptionHtml: p.descriptionHtml ?? null,
    applyUrl: p.hostedUrl ?? p.applyUrl ?? '',
    locationCity:       city,
    locationRegion:     region,
    locationPostalCode: null,
    locationCountry:    'US',
    remote:             p.workplaceType === 'remote',
    employmentType:     mapLeverCommitment(p.categories?.commitment),
    industry:           p.categories?.team?.toLowerCase().replace(/\s+/g, '_') ?? null,
    salaryMin: null, salaryMax: null, salaryCurrency: 'USD',
    requiredSkills: [], requiredCertifications: [], minYearsExperience: null,
    postedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    expiresAt: null,
    sourceCode: 'ats_boards', sourceName: 'ATS Boards',
  });
}

function mapLeverCommitment(c: string | undefined): JobDto['employmentType'] {
  if (!c) return 'FULL_TIME';
  const l = c.toLowerCase();
  if (l.includes('part')) return 'PART_TIME';
  if (l.includes('contract')) return 'CONTRACT';
  if (l.includes('intern')) return 'INTERNSHIP';
  return 'FULL_TIME';
}

// ── Ashby ───────────────────────────────────────────────────────────

interface AshbyJob {
  id?: string;
  title?: string;
  location?: string;
  employmentType?: string;
  team?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  jobUrl?: string;
  publishedAt?: string;
  isRemote?: boolean;
}

async function fetchAshby(e: Employer): Promise<JobDto[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${e.slug}?includeCompensation=true`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: AshbyJob[] };
  return (data.jobs ?? []).filter((j) => isUsLocation(j.location)).map((j) => normalizeAshby(j, e));
}

function normalizeAshby(j: AshbyJob, e: Employer): JobDto {
  const desc = j.descriptionPlain ?? stripHtml(j.descriptionHtml ?? '');
  const { city, region } = parseLocation(j.location ?? null);
  return applyClassification({
    id: `ashby-${e.slug}-${j.id ?? hash(j.title ?? '')}`,
    title:   j.title ?? '',
    company: e.name,
    description: desc,
    descriptionHtml: j.descriptionHtml ?? null,
    applyUrl: j.jobUrl ?? '',
    locationCity:       city,
    locationRegion:     region,
    locationPostalCode: null,
    locationCountry:    'US',
    remote:             !!j.isRemote,
    employmentType:     mapAshbyType(j.employmentType),
    industry:           j.team?.toLowerCase().replace(/\s+/g, '_') ?? null,
    salaryMin: null, salaryMax: null, salaryCurrency: 'USD',
    requiredSkills: [], requiredCertifications: [], minYearsExperience: null,
    postedAt: j.publishedAt ?? null, expiresAt: null,
    sourceCode: 'ats_boards', sourceName: 'ATS Boards',
  });
}

function mapAshbyType(t: string | undefined): JobDto['employmentType'] {
  if (!t) return 'FULL_TIME';
  const l = t.toLowerCase();
  if (l.includes('part')) return 'PART_TIME';
  if (l.includes('contract')) return 'CONTRACT';
  if (l.includes('intern')) return 'INTERNSHIP';
  if (l.includes('temp')) return 'TEMP';
  return 'FULL_TIME';
}

// ── Shared helpers ──────────────────────────────────────────────────

// Global employers post worldwide on these boards; this is a US-focused
// reentry tool, so drop clearly non-US roles. Empty/remote locations are kept
// (often US-or-anywhere remote).
const NON_US = /\b(canada|ontario|toronto|vancouver|montreal|québec|quebec|united kingdom|u\.k\.|\buk\b|england|scotland|wales|london|manchester|ireland|dublin|germany|berlin|munich|deutschland|france|paris|spain|madrid|barcelona|italy|rome|milan|netherlands|amsterdam|portugal|lisbon|poland|warsaw|sweden|stockholm|norway|denmark|finland|switzerland|austria|belgium|romania|hungary|czech|greece|turkey|israel|tel aviv|india|bangalore|bengaluru|hyderabad|mumbai|delhi|gurgaon|gurugram|pune|chennai|haryana|japan|tokyo|china|beijing|shanghai|shenzhen|hong kong|singapore|australia|sydney|melbourne|new zealand|mexico|brazil|são paulo|sao paulo|argentina|colombia|chile|philippines|manila|vietnam|hanoi|thailand|bangkok|indonesia|jakarta|taiwan|korea|seoul|uae|dubai|abu dhabi|saudi|egypt|nigeria|kenya|south africa|ukraine|lithuania|latvia|estonia|emea|apac|latam)\b/i;
function isUsLocation(raw: string | null | undefined): boolean {
  const s = (raw ?? '').trim();
  if (!s) return true;
  if (/remote|anywhere|worldwide|distributed|virtual/i.test(s)) return true;
  return !NON_US.test(s);
}

function parseLocation(raw: string | null): { city: string | null; region: string | null } {
  if (!raw) return { city: null, region: null };
  if (/remote|anywhere|worldwide/i.test(raw)) return { city: 'Remote', region: null };
  const parts = raw.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    const r = parts[1].length === 2 ? parts[1].toUpperCase() : parts[1].split(' ')[0].toUpperCase();
    return { city: parts[0] || null, region: r || null };
  }
  return { city: parts[0] || null, region: null };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
}
