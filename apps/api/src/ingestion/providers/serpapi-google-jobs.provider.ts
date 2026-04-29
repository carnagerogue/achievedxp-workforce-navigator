import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentType } from '@prisma/client';
import { CanonicalJob, JobProvider, RawJobPayload } from './job-provider.interface';
import { normalizeUsRegion } from '../../location/us-states';

/**
 * SerpApi Google Jobs provider.
 *
 * SerpApi is a paid scraper that fronts Google Jobs (which itself
 * aggregates from many ATS systems — Greenhouse, Lever, Workday, etc.).
 * That makes it the best single-source for the long tail of small
 * employers that USAJobs / Adzuna / Jooble / Remotive miss.
 *
 * API:        GET https://serpapi.com/search.json?engine=google_jobs
 * Auth:       api_key query param
 * Pagination: each result page is a fresh search with `next_page_token`
 * Limits:     free tier = 100 searches / month — be conservative
 *
 * Strategy: keyword × location matrix, capped pages per tuple. With the
 * default config (10 keywords × 1 "United States" location × 1 page)
 * = 10 searches per ingestion run. Set MAX_PAGES > 1 only if the API
 * key allows for higher volume.
 *
 * Docs: https://serpapi.com/google-jobs-api
 */
@Injectable()
export class SerpApiGoogleJobsProvider implements JobProvider {
  readonly code = 'serpapi_google_jobs';

  private readonly logger = new Logger(SerpApiGoogleJobsProvider.name);
  private readonly endpoint = 'https://serpapi.com/search.json';

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<RawJobPayload[]> {
    const apiKey = this.config.get<string>('SERPAPI_API_KEY');
    if (!apiKey) {
      this.logger.warn('SERPAPI_API_KEY not set; skipping');
      return [];
    }

    const keywords = this.parseList(
      this.config.get<string>('SERPAPI_GOOGLE_JOBS_KEYWORDS') ??
        'warehouse,forklift,cdl driver,maintenance,custodian,cook,landscaping,laborer,manufacturing,housekeeping',
    );
    const locations = this.parseList(
      this.config.get<string>('SERPAPI_GOOGLE_JOBS_LOCATIONS') ?? 'United States',
    );
    const maxPages = Math.max(1, Number(this.config.get<string>('SERPAPI_GOOGLE_JOBS_MAX_PAGES') ?? '1'));
    const gl = this.config.get<string>('SERPAPI_GOOGLE_JOBS_GL') ?? 'us';
    const hl = this.config.get<string>('SERPAPI_GOOGLE_JOBS_HL') ?? 'en';

    const out: RawJobPayload[] = [];
    const seen = new Set<string>();
    let totalSearches = 0;

    for (const keyword of keywords) {
      for (const location of locations) {
        let nextPageToken: string | undefined;
        for (let page = 0; page < maxPages; page++) {
          totalSearches++;
          const url = new URL(this.endpoint);
          url.searchParams.set('engine', 'google_jobs');
          url.searchParams.set('q', keyword);
          if (location) url.searchParams.set('location', location);
          url.searchParams.set('gl', gl);
          url.searchParams.set('hl', hl);
          url.searchParams.set('api_key', apiKey);
          if (nextPageToken) url.searchParams.set('next_page_token', nextPageToken);

          let res: Response;
          try {
            res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
          } catch (err) {
            this.logger.warn(`SerpApi fetch failed (kw="${keyword}", loc="${location}", p=${page}): ${(err as Error).message}`);
            break;
          }

          if (!res.ok) {
            const text = await res.text().catch(() => '');
            this.logger.warn(`SerpApi ${res.status} for kw="${keyword}" loc="${location}" p=${page}: ${text.slice(0, 200)}`);
            // 401/403/429 → bail out of all loops; further calls will only burn quota.
            if ([401, 403, 429].includes(res.status)) {
              this.logger.warn(`SerpApi blocking status ${res.status} — stopping ingestion run early`);
              return out;
            }
            break;
          }

          let payload: SerpApiResponse;
          try {
            payload = (await res.json()) as SerpApiResponse;
          } catch {
            this.logger.warn(`SerpApi non-JSON response for kw="${keyword}"`);
            break;
          }

          if (payload.error) {
            this.logger.warn(`SerpApi error: ${String(payload.error).slice(0, 200)}`);
            break;
          }

          const jobs = payload.jobs_results ?? [];
          for (const j of jobs) {
            const id = j.job_id ?? this.makeStableId(j);
            if (!id || seen.has(id)) continue;
            seen.add(id);
            out.push({ externalId: id, payload: j });
          }

          nextPageToken = payload.serpapi_pagination?.next_page_token;
          if (!nextPageToken) break;
        }
      }
    }

    this.logger.log(
      `SerpApi fetched ${out.length} unique postings using ${totalSearches} searches (${keywords.length} keywords × ${locations.length} locations × up to ${maxPages} pages)`,
    );
    return out;
  }

  normalize(raw: unknown): CanonicalJob {
    const j = raw as SerpApiJob;

    const { city, region } = this.parseLocation(j.location ?? '');
    const { min, max } = this.parseSalaryFromExtensions(j.detected_extensions, j.extensions ?? []);
    const description = (j.description ?? '').replace(/\s+/g, ' ').trim();
    const applyUrl = j.apply_options?.[0]?.link ?? j.related_links?.[0]?.link ?? '';

    return {
      externalId: j.job_id ?? this.makeStableId(j),
      title: (j.title ?? '').trim(),
      company: (j.company_name ?? '').trim() || 'Unknown employer',
      description,
      descriptionHtml: null, // Google Jobs descriptions are plain text via SerpApi
      applyUrl,
      locationCity:       city,
      locationRegion:     region,
      locationPostalCode: null,
      locationCountry:    'US',
      remote:             this.isRemote(j),
      employmentType:     this.toEmploymentType(j.detected_extensions?.schedule_type, j.extensions ?? []),
      industry:           null, // classifier fills from text
      salaryMin:          min,
      salaryMax:          max,
      salaryCurrency:     'USD',
      requiredSkills:         [],
      requiredCertifications: [],
      minYearsExperience:     null,
      postedAt:           this.parsePostedAt(j.detected_extensions, j.extensions ?? []),
      expiresAt:          null,
    };
  }

  /** SerpApi sometimes omits job_id on near-duplicates — fall back to a stable hash. */
  private makeStableId(j: SerpApiJob): string {
    const parts = [j.title ?? '', j.company_name ?? '', j.location ?? '', (j.description ?? '').slice(0, 60)];
    return 'sa_' + Buffer.from(parts.join('|')).toString('base64url').slice(0, 32);
  }

  private parseLocation(text: string): { city: string | null; region: string | null } {
    if (!text) return { city: null, region: null };
    if (/^remote\b/i.test(text.trim())) return { city: null, region: null };

    const parts = text.split(/[,()]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return { city: null, region: null };

    let region: string | null = null;
    let city: string | null = null;
    for (let i = 0; i < parts.length; i++) {
      const r = normalizeUsRegion(parts[i]);
      if (r) {
        region = r;
        if (i > 0) city = parts[i - 1] || null;
        break;
      }
    }
    return { city, region };
  }

  /**
   * SerpApi exposes salary in `detected_extensions.salary` (preferred) or
   * a free-text item in `extensions[]`. Both forms tolerated; out-of-range
   * values rejected so we don't repeat the Jooble pizza-maker bug.
   */
  private parseSalaryFromExtensions(
    detected: SerpApiDetectedExtensions | undefined,
    extensions: string[],
  ): { min: number | null; max: number | null } {
    const candidates: string[] = [];
    if (detected?.salary) candidates.push(detected.salary);
    for (const ext of extensions) {
      if (/\$|salary|year|month|hour|wage/i.test(ext)) candidates.push(ext);
    }
    if (candidates.length === 0) return { min: null, max: null };

    for (const raw of candidates) {
      const parsed = this.parseSalaryString(raw);
      if (parsed.min !== null) return parsed;
    }
    return { min: null, max: null };
  }

  /** Tolerant parser that mirrors the Jooble fix — never annualizes blindly. */
  private parseSalaryString(raw: string): { min: number | null; max: number | null } {
    if (!raw) return { min: null, max: null };
    const text = raw.replace(/\u2013|\u2014/g, '-').trim();

    type Cadence = 'hour' | 'year' | 'month' | 'unknown';
    const matches = [...text.matchAll(/(\$?\s*\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?)\s*([kKmM]?)\s*([a-zA-Z\/]*)/g)];
    const found: number[] = [];

    for (const m of matches) {
      const n = Number(m[1].replace(/[$,\s]/g, ''));
      const suffix = m[2];
      const unit = (m[3] || '').toLowerCase();
      if (!Number.isFinite(n) || n <= 0) continue;
      let value = n;
      if (suffix === 'k' || suffix === 'K') value *= 1000;
      if (suffix === 'm' || suffix === 'M') value *= 1_000_000;

      let cadence: Cadence = 'unknown';
      if (/^(hr|hour|hourly|h|per\s*hour)$/i.test(unit)) cadence = 'hour';
      else if (/^(yr|year|annual|annually|per\s*year)$/i.test(unit)) cadence = 'year';
      else if (/^(mo|month|monthly|per\s*month)$/i.test(unit)) cadence = 'month';
      // Free-text salary fields tend to include cadence somewhere — also peek at original text.
      if (cadence === 'unknown') {
        if (/\b(hour|hourly|hr|\/h)\b/i.test(text)) cadence = 'hour';
        else if (/\b(year|annual|yearly|yr|annum)\b/i.test(text)) cadence = 'year';
        else if (/\b(month|monthly|mo)\b/i.test(text)) cadence = 'month';
      }
      if (cadence === 'unknown') {
        if (value >= 5000) cadence = 'year';
        else if (value >= 5 && value <= 200) cadence = 'hour';
        else continue;
      }

      const annual =
        cadence === 'hour'  ? Math.round(value * 2080) :
        cadence === 'month' ? Math.round(value * 12)   :
                              Math.round(value);

      if (annual < 12_000 || annual > 750_000) continue;
      found.push(annual);
    }

    if (found.length === 0) return { min: null, max: null };
    return { min: Math.min(...found), max: Math.max(...found) };
  }

  private toEmploymentType(scheduleType: string | undefined, extensions: string[]): EmploymentType {
    const blob = `${scheduleType ?? ''} ${extensions.join(' ')}`.toLowerCase().replace(/[\s\-_]+/g, '');
    if (blob.startsWith('fulltime') || blob.includes('fulltime')) return EmploymentType.FULL_TIME;
    if (blob.startsWith('parttime') || blob.includes('parttime')) return EmploymentType.PART_TIME;
    if (blob.includes('contract')) return EmploymentType.CONTRACT;
    if (blob.includes('temp')) return EmploymentType.TEMP;
    if (blob.includes('intern')) return EmploymentType.INTERNSHIP;
    return EmploymentType.OTHER;
  }

  private isRemote(j: SerpApiJob): boolean {
    if (j.detected_extensions?.work_from_home) return true;
    return /\bremote\b/i.test(j.location ?? '') || /\bremote\b/i.test(j.title ?? '');
  }

  private parsePostedAt(
    detected: SerpApiDetectedExtensions | undefined,
    extensions: string[],
  ): Date | null {
    const raw = detected?.posted_at ?? extensions.find((e) => /\bago\b/i.test(e)) ?? null;
    if (!raw) return null;
    // Strings like "3 days ago", "1 hour ago" — convert to a Date.
    const m = raw.match(/(\d+)\s*(minute|hour|day|week|month)s?\s*ago/i);
    if (!m) return null;
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const ms = unit === 'minute' ? n * 60_000
             : unit === 'hour'   ? n * 3_600_000
             : unit === 'day'    ? n * 86_400_000
             : unit === 'week'   ? n * 7 * 86_400_000
             : unit === 'month'  ? n * 30 * 86_400_000
             : 0;
    return ms ? new Date(Date.now() - ms) : null;
  }

  private parseList(s: string): string[] {
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  }
}

// ─── SerpApi response shapes (subset we use) ───
interface SerpApiResponse {
  jobs_results?: SerpApiJob[];
  serpapi_pagination?: { next_page_token?: string };
  error?: string | unknown;
}

interface SerpApiJob {
  job_id?: string;
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  extensions?: string[];
  detected_extensions?: SerpApiDetectedExtensions;
  apply_options?: Array<{ link?: string; title?: string }>;
  related_links?: Array<{ link?: string; text?: string }>;
}

interface SerpApiDetectedExtensions {
  posted_at?: string;
  schedule_type?: string;
  salary?: string;
  work_from_home?: boolean;
}
