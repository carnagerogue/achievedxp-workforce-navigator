import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentType } from '@prisma/client';
import { CanonicalJob, JobProvider, RawJobPayload } from './job-provider.interface';
import { normalizeUsRegion } from '../../location/us-states';

/**
 * Jooble API provider — meta-aggregator that combines postings from many
 * underlying job boards. Useful complement to USAJobs (federal-only) and
 * Adzuna (private aggregator); brings broader sector + small-employer
 * coverage that the others miss.
 *
 * API:     POST https://jooble.org/api/{api_key}
 * Auth:    API key in URL path (no Authorization header)
 * Limits:  default plan = 500 requests / month (per partner email)
 *
 * Strategy: one POST per (keyword, location) tuple, paginated up to
 * `JOOBLE_MAX_PAGES` per tuple. With 500 req/month and once-daily cron,
 * the budget is ~16 requests/day, which comfortably covers our keyword
 * + location matrix.
 *
 * Docs:    https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation
 */
@Injectable()
export class JoobleProvider implements JobProvider {
  readonly code = 'jooble';

  private readonly logger = new Logger(JoobleProvider.name);
  private readonly endpointBase = 'https://jooble.org/api';

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<RawJobPayload[]> {
    const apiKey = this.config.get<string>('JOOBLE_API_KEY');
    if (!apiKey) {
      this.logger.warn('JOOBLE_API_KEY not set; skipping');
      return [];
    }

    // Reentry-friendly keyword set, biased toward roles that historically
    // hire fair-chance candidates. Tunable via env var.
    const keywords = this.parseList(
      this.config.get<string>('JOOBLE_KEYWORDS') ??
        'warehouse,forklift,cdl driver,maintenance,custodian,cook,landscaping,laborer,manufacturing,housekeeping',
    );

    // Locations — major metros are intentionally diverse to avoid coastal
    // bias. Empty string = nationwide.
    const locations = this.parseList(
      this.config.get<string>('JOOBLE_LOCATIONS') ??
        'United States',
    );

    const maxPages = Math.max(1, Number(this.config.get<string>('JOOBLE_MAX_PAGES') ?? '2'));
    const resultsPerPage = Math.min(50, Number(this.config.get<string>('JOOBLE_RESULTS_PER_PAGE') ?? '20'));
    const radiusKm = Number(this.config.get<string>('JOOBLE_RADIUS_KM') ?? '40'); // ~25 mi
    const url = `${this.endpointBase}/${encodeURIComponent(apiKey)}`;

    const out: RawJobPayload[] = [];
    const seen = new Set<string>();

    for (const keyword of keywords) {
      for (const location of locations) {
        for (let page = 1; page <= maxPages; page++) {
          const body: JoobleRequest = {
            keywords: keyword,
            location: location || '',
            page: String(page),
            ResultOnPage: resultsPerPage,
          };
          if (radiusKm > 0 && location) body.radius = String(radiusKm);

          let res: Response;
          try {
            res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify(body),
            });
          } catch (err) {
            this.logger.warn(`Jooble fetch failed (kw="${keyword}", loc="${location}", p=${page}): ${(err as Error).message}`);
            break;
          }

          if (!res.ok) {
            const text = await res.text().catch(() => '');
            this.logger.warn(`Jooble ${res.status} for kw="${keyword}" loc="${location}" p=${page}: ${text.slice(0, 200)}`);
            // 403 = bad key (don't keep retrying); other errors → stop this tuple but try the next.
            if (res.status === 403) return out;
            break;
          }

          let payload: JoobleResponse;
          try {
            payload = (await res.json()) as JoobleResponse;
          } catch {
            this.logger.warn(`Jooble returned non-JSON for kw="${keyword}"`);
            break;
          }

          const jobs = payload.jobs ?? [];
          for (const j of jobs) {
            const id = j.id != null ? String(j.id) : '';
            if (!id || seen.has(id)) continue;
            seen.add(id);
            out.push({ externalId: id, payload: j });
          }

          // Stop early if the page wasn't full — no more results.
          if (jobs.length < resultsPerPage) break;
        }
      }
    }

    this.logger.log(
      `Jooble fetched ${out.length} unique postings (${keywords.length} keywords × ${locations.length} locations × up to ${maxPages} pages)`,
    );
    return out;
  }

  normalize(raw: unknown): CanonicalJob {
    const j = raw as JoobleJob;

    const { city, region } = this.parseLocation(j.location ?? '');
    const { min, max } = this.parseSalary(j.salary ?? '');
    const description = (j.snippet ?? '').replace(/<\/?[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    return {
      externalId: String(j.id ?? ''),
      title: (j.title ?? '').trim(),
      company: (j.company ?? '').trim() || (j.source ?? 'Jooble').trim(),
      description,
      descriptionHtml: j.snippet ?? null,
      applyUrl: j.link ?? '',
      locationCity:       city,
      locationRegion:     region,
      locationPostalCode: null,
      locationCountry:    'US',
      remote:             /\bremote\b/i.test(j.location ?? '') || /\bremote\b/i.test(j.title ?? ''),
      employmentType:     this.toEmploymentType(j.type),
      industry:           null,                 // classifier fills from text
      salaryMin:          min,
      salaryMax:          max,
      salaryCurrency:     'USD',
      requiredSkills:         [],
      requiredCertifications: [],
      minYearsExperience:     null,
      postedAt:  j.updated ? safeDate(j.updated) : null,
      expiresAt: null,
    };
  }

  /**
   * Pull "City, ST" out of Jooble's location strings ("Columbus, OH",
   * "Columbus, OH 43215", "Remote"). Returns nulls when no US state is
   * recognized — the classifier still works against the title/description.
   */
  private parseLocation(text: string): { city: string | null; region: string | null } {
    if (!text) return { city: null, region: null };
    if (/^remote\b/i.test(text.trim())) return { city: null, region: null };

    const parts = text.split(/[,()]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return { city: null, region: null };

    let region: string | null = null;
    let city: string | null = null;
    // Match the first part that resolves to a state, take the previous part as the city.
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
   * Extract numeric bounds from Jooble's free-form salary strings. Same
   * tolerant regex Remotive uses — handles "$50,000 - $70,000",
   * "USD 90k", "$25/hour", "60k+", etc.
   */
  private parseSalary(raw: string): { min: number | null; max: number | null } {
    if (!raw) return { min: null, max: null };

    // Detect hourly rates: "$22/hr", "$22.50 per hour"
    const hourly = /\b(\d+(?:\.\d+)?)\s*(?:\/|per\s+)?(?:h(?:r|our)?|hr)/i.test(raw);

    const matches = [...raw.matchAll(/(\d{1,3}(?:[.,]\d{3})*(?:\.\d+)?)\s*([kK])?/g)];
    const nums = matches
      .map((m) => {
        const n = Number(m[1].replace(/[.,]/g, ''));
        if (!Number.isFinite(n)) return null;
        return m[2] ? n * 1000 : n;
      })
      .filter((n): n is number => n !== null);

    if (nums.length === 0) return { min: null, max: null };

    // If hourly, assume 2,080 hrs/yr to convert to annual.
    const annualize = (n: number) => (hourly ? Math.round(n * 2080) : Math.round(n));

    const usable = nums.filter((n) => (hourly ? n > 5 : n > 1000));
    if (usable.length === 0) return { min: null, max: null };
    if (usable.length === 1) {
      const v = annualize(usable[0]);
      return { min: v, max: v };
    }
    return { min: annualize(Math.min(...usable)), max: annualize(Math.max(...usable)) };
  }

  /**
   * Jooble exposes a free-form `type` string ("Full-time", "Part time",
   * "Contract", "Internship") — map to our enum, default OTHER.
   */
  private toEmploymentType(raw?: string): EmploymentType {
    const t = (raw ?? '').toLowerCase().replace(/[\s\-_]+/g, '');
    if (t.startsWith('fulltime'))   return EmploymentType.FULL_TIME;
    if (t.startsWith('parttime'))   return EmploymentType.PART_TIME;
    if (t.startsWith('contract'))   return EmploymentType.CONTRACT;
    if (t.startsWith('temp'))       return EmploymentType.TEMP;
    if (t.startsWith('intern'))     return EmploymentType.INTERNSHIP;
    return EmploymentType.OTHER;
  }

  private parseList(s: string): string[] {
    return s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
}

// ─── helpers ───
function safeDate(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Jooble request / response shapes ───
interface JoobleRequest {
  keywords: string;
  location: string;
  radius?: string;
  salary?: number;
  page?: string;
  ResultOnPage?: number;
  SearchMode?: number;
  companysearch?: boolean;
}

interface JoobleResponse {
  totalCount?: number;
  jobs?: JoobleJob[];
}

interface JoobleJob {
  id?: number | string;
  title?: string;
  location?: string;
  snippet?: string;     // HTML-ish description excerpt
  salary?: string;
  source?: string;      // upstream board name (Indeed, Monster, etc.)
  type?: string;        // employment type free text
  link?: string;
  company?: string;
  updated?: string;     // ISO date-ish
}
