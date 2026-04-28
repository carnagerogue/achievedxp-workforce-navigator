import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentType } from '@prisma/client';
import { CanonicalJob, JobProvider, RawJobPayload } from './job-provider.interface';
import { normalizeUsRegion } from '../../location/us-states';

/**
 * Remotive API provider — remote-friendly job postings, mostly tech-leaning
 * but also includes customer-support, design, marketing, and non-tech roles.
 *
 * API:     GET https://remotive.com/api/remote-jobs
 * Auth:    none
 * Limits:  > 2 req/min gets blocked; they recommend ≤ 4 calls/day.
 *
 * Why this fits our users: remote roles mean no transportation barrier,
 * which is one of the top employment blockers for justice-impacted
 * candidates. Also, many remote employers are more open about fair-chance
 * hiring than traditional office jobs.
 */
@Injectable()
export class RemotiveProvider implements JobProvider {
  readonly code = 'remotive';

  private readonly logger = new Logger(RemotiveProvider.name);
  private readonly endpoint = 'https://remotive.com/api/remote-jobs';

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<RawJobPayload[]> {
    const limit = Number(this.config.get<string>('REMOTIVE_LIMIT') ?? '200');
    const category = this.config.get<string>('REMOTIVE_CATEGORY') ?? '';
    const usOnly = String(this.config.get<string>('REMOTIVE_US_ONLY') ?? 'false') === 'true';

    const url = new URL(this.endpoint);
    url.searchParams.set('limit', String(limit));
    if (category) url.searchParams.set('category', category);

    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        // Hard timeout so a hung Remotive endpoint doesn't stall the cron.
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.warn(`Remotive ${res.status}: ${await res.text().catch(() => '')}`);
        return [];
      }
      const body = (await res.json()) as RemotiveResponse;
      let jobs = body.jobs ?? [];

      // US-only filter: keep anything that accepts US candidates. That
      // includes explicit US postings AND "Worldwide"/"Anywhere"/blank
      // locations (which accept applicants from anywhere, including the
      // US). Only filter out postings that target a specific non-US
      // region — e.g., "Europe Only", "Canada", "LATAM".
      if (usOnly) {
        jobs = jobs.filter((j) => {
          const loc = (j.candidate_required_location ?? '').trim();
          if (!loc) return true;
          if (/\b(us|usa|u\.s\.|united states|north america|anywhere|worldwide|global)\b/i.test(loc)) {
            return true;
          }
          return false;
        });
      }

      this.logger.log(`Remotive fetched ${jobs.length} postings (us_only=${usOnly}, category=${category || 'any'})`);
      return jobs.map((j) => ({ externalId: String(j.id), payload: j }));
    } catch (err) {
      this.logger.warn(`Remotive fetch failed: ${(err as Error).message}`);
      return [];
    }
  }

  normalize(raw: unknown): CanonicalJob {
    const j = raw as RemotiveJob;

    const locationText = j.candidate_required_location ?? '';
    const { city, region } = this.parseLocation(locationText);
    const { min, max } = this.parseSalary(j.salary);

    // Remotive returns rich HTML directly — preserve it so lists and
    // headings render on the detail page. The plain-text fallback strips
    // tags for search/indexing contexts.
    const rawHtml = j.description ?? '';
    const plain = rawHtml.replace(/<\/?[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    return {
      externalId: String(j.id),
      title: j.title ?? '',
      company: j.company_name ?? 'Remote employer',
      description: plain,
      descriptionHtml: rawHtml || null,
      applyUrl: j.url ?? '',
      locationCity:       city,
      locationRegion:     region,
      locationPostalCode: null,
      locationCountry:    'US',
      remote:             true, // by definition, this is Remotive
      employmentType:     this.toEmploymentType(j.job_type),
      industry:           null, // classifier fills from text
      salaryMin:          min,
      salaryMax:          max,
      salaryCurrency:     'USD',
      requiredSkills:         [],
      requiredCertifications: [],
      minYearsExperience:     null,
      postedAt:  j.publication_date ? new Date(j.publication_date) : null,
      expiresAt: null,
    };
  }

  /**
   * Pull a state code out of strings like "USA, California", "United States (NY)".
   * Returns nulls when no US state is named — which is most of Remotive,
   * since postings are typically "USA Only" or "Worldwide".
   */
  private parseLocation(text: string): { city: string | null; region: string | null } {
    if (!text) return { city: null, region: null };

    // Try each comma-separated part; first state-name hit wins.
    for (const part of text.split(/[,()]/).map((s) => s.trim())) {
      const region = normalizeUsRegion(part);
      if (region) return { city: null, region };
    }
    return { city: null, region: null };
  }

  /**
   * Parse Remotive's free-form salary strings: "$50,000 - $70,000", "USD 90k-110k",
   * "Up to $60000", "€40,000+", etc. Returns best-effort integer bounds;
   * falls back to nulls for unparseable values.
   */
  private parseSalary(raw?: string): { min: number | null; max: number | null } {
    if (!raw) return { min: null, max: null };

    // Extract up to two numbers, handling "k" suffix for thousands.
    const matches = [...raw.matchAll(/(\d{1,3}(?:[.,]\d{3})*(?:\.\d+)?)\s*([kK])?/g)];
    const nums = matches.map((m) => {
      const n = Number(m[1].replace(/[.,]/g, ''));
      if (!Number.isFinite(n)) return null;
      return m[2] ? n * 1000 : n;
    }).filter((n): n is number => n !== null && n > 1000); // skip things like "2+ years"

    if (nums.length === 0) return { min: null, max: null };
    if (nums.length === 1) return { min: Math.round(nums[0]), max: Math.round(nums[0]) };
    return { min: Math.round(Math.min(...nums)), max: Math.round(Math.max(...nums)) };
  }

  private toEmploymentType(raw?: string): EmploymentType {
    switch ((raw ?? '').toLowerCase()) {
      case 'full_time':  return EmploymentType.FULL_TIME;
      case 'part_time':  return EmploymentType.PART_TIME;
      case 'contract':   return EmploymentType.CONTRACT;
      case 'internship': return EmploymentType.INTERNSHIP;
      case 'freelance':  return EmploymentType.CONTRACT;
      default:           return EmploymentType.OTHER;
    }
  }
}

// ───────── minimal typing of the Remotive response ─────────

interface RemotiveResponse {
  'job-count'?: number;
  jobs?: RemotiveJob[];
}

interface RemotiveJob {
  id?: number | string;
  url?: string;
  title?: string;
  company_name?: string;
  company_logo?: string;
  category?: string;
  job_type?: string; // full_time, part_time, contract, internship, freelance
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string; // HTML
}
