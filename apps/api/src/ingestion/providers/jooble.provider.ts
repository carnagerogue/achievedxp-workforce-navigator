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
   * Extract numeric bounds from Jooble's free-form salary strings.
   *
   * Earlier version had a class of bug where Jooble strings combining
   * hourly + annual figures, or stray numeric tokens (like "401k" or
   * "2024"), were all annualized blindly — producing absurd numbers
   * like a $443,040 pizza-maker. This rewrite is conservative:
   *
   *   1. Pair each number with its IMMEDIATELY-FOLLOWING unit token
   *      (per hour, per year, per month, hr, yr, mo, k, …) — never
   *      apply hourly conversion to a number that is itself written
   *      as an annual figure.
   *   2. Reject obvious non-salary numbers: years (1900-2100 alone),
   *      "401k", "20%", anything > $750k annual, anything > $500/hr.
   *   3. Drop the result entirely if the parsed value is implausible
   *      rather than displaying garbage.
   */
  private parseSalary(raw: string): { min: number | null; max: number | null } {
    if (!raw) return { min: null, max: null };
    const text = raw.replace(/\u2013|\u2014/g, '-').trim();

    // Walk the string and bind each numeric token to the unit that
    // immediately follows it. Unrecognized contexts are skipped.
    const tokenRe = /(\$?\s*\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?)\s*([kKmM]?)\s*([a-zA-Z\/]*)/g;
    type Salary = { value: number; cadence: 'hour' | 'year' | 'month' | 'unknown' };
    const found: Salary[] = [];

    let match: RegExpExecArray | null;
    while ((match = tokenRe.exec(text)) !== null) {
      const numStr = match[1].replace(/[$,\s]/g, '');
      const suffix = match[2];
      const unit = (match[3] || '').toLowerCase();
      let value = Number(numStr);
      if (!Number.isFinite(value) || value <= 0) continue;
      if (suffix === 'k' || suffix === 'K') value *= 1000;
      if (suffix === 'm' || suffix === 'M') value *= 1_000_000;

      // Skip known non-salary tokens
      if (/^401/.test(numStr)) continue;             // "401k"
      if (value >= 1900 && value <= 2100 && suffix === '') continue; // "2024"
      if (/(percent|%)/i.test(unit)) continue;

      let cadence: Salary['cadence'] = 'unknown';
      if (/^(hr|hour|hourly|h|per\s*hour)$/i.test(unit)) cadence = 'hour';
      else if (/^(\/?\s*hr|\/?\s*hour|\/h)$/i.test(unit)) cadence = 'hour';
      else if (/^(yr|year|annual|annually|per\s*year)$/i.test(unit)) cadence = 'year';
      else if (/^(mo|month|monthly|per\s*month)$/i.test(unit)) cadence = 'month';

      // Heuristic if no explicit unit: large number → annual, small → hourly.
      if (cadence === 'unknown') {
        if (value >= 5000) cadence = 'year';
        else if (value >= 5 && value <= 200) cadence = 'hour';
        else continue; // implausible, skip
      }

      // Convert everything to annual, dropping implausible values.
      const annual =
        cadence === 'hour'  ? Math.round(value * 2080) :
        cadence === 'month' ? Math.round(value * 12)   :
                              Math.round(value);

      // Reject obvious garbage outputs.
      if (annual < 12_000) continue;     // <$12k/yr full-time = unusable
      if (annual > 750_000) continue;    // >$750k for the kind of role we ingest = parse error

      found.push({ value: annual, cadence });
    }

    if (found.length === 0) return { min: null, max: null };
    const annuals = found.map((f) => f.value);
    const min = Math.min(...annuals);
    const max = Math.max(...annuals);
    return { min, max };
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
