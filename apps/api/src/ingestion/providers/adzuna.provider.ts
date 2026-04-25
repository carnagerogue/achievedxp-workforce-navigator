import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentType } from '@prisma/client';
import { CanonicalJob, JobProvider, RawJobPayload } from './job-provider.interface';
import { normalizeUsRegion } from '../../location/us-states';
import { plainTextToHtml } from '../html-sanitize';

// Full US state list — names Adzuna accepts in `where`. Keeping this here
// (not pulling from a shared const) keeps the provider self-contained.
const US_STATE_NAMES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' },     { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },     { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'Washington DC' },{ code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },     { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },       { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },     { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },      { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },   { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },    { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },    { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },     { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },      { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },    { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },{ code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },    { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },{ code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },   { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },        { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },    { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export const ADZUNA_STATES = US_STATE_NAMES;

/**
 * Adzuna Search API provider — real US private-sector postings.
 *
 * API docs: https://developer.adzuna.com/overview
 *
 * Auth is query-string (app_id + app_key), no headers needed.
 * Free tier cap is ~1000 calls/month so we run conservative pagination
 * (default 5 keywords × 2 pages = 10 calls per ingest run ⇒ ~3 runs/day fits).
 *
 * Fit for this product: private-sector + salary data fills the gap left
 * by USAJobs. The classifier tags each posting's industry/risk downstream,
 * and the `excludes_felons` flag is set from description text when the
 * employer explicitly states it — Adzuna doesn't have a dedicated field.
 */
@Injectable()
export class AdzunaProvider implements JobProvider {
  readonly code = 'adzuna';

  private readonly logger = new Logger(AdzunaProvider.name);
  private readonly base = 'https://api.adzuna.com/v1/api/jobs';

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<RawJobPayload[]> {
    const appId = this.config.get<string>('ADZUNA_APP_ID');
    const appKey = this.config.get<string>('ADZUNA_APP_KEY');
    if (!appId || !appKey) {
      this.logger.warn('ADZUNA_APP_ID or ADZUNA_APP_KEY missing — skipping fetch');
      return [];
    }

    const country = (this.config.get<string>('ADZUNA_COUNTRY') ?? 'us').toLowerCase();
    const where   = this.config.get<string>('ADZUNA_WHERE') ?? '';
    const maxPages = Number(this.config.get<string>('ADZUNA_MAX_PAGES') ?? '2');
    const keywords = (this.config.get<string>('ADZUNA_KEYWORDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const searchTerms = keywords.length > 0 ? keywords : [''];
    const collected = new Map<string, unknown>();

    for (const term of searchTerms) {
      for (let page = 1; page <= maxPages; page++) {
        const url = new URL(`${this.base}/${country}/search/${page}`);
        url.searchParams.set('app_id', appId);
        url.searchParams.set('app_key', appKey);
        url.searchParams.set('results_per_page', '50');
        url.searchParams.set('content-type', 'application/json');
        if (term)  url.searchParams.set('what',  term);
        if (where) url.searchParams.set('where', where);

        try {
          const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
          if (!res.ok) {
            const txt = await res.text().catch(() => '');
            this.logger.warn(`Adzuna ${res.status} for "${term}" p${page}: ${txt.slice(0, 200)}`);
            break;
          }
          const body = (await res.json()) as AdzunaSearchResponse;
          const items = body?.results ?? [];
          for (const item of items) {
            if (item?.id && !collected.has(String(item.id))) {
              collected.set(String(item.id), item);
            }
          }
          if (items.length < 50) break; // end of results for this term
        } catch (err) {
          this.logger.warn(`Adzuna fetch failed for "${term}" p${page}: ${(err as Error).message}`);
          break;
        }

        // Polite pacing — Adzuna doesn't publish a hard rate limit but free
        // tier is monthly-quota-based, so adding a half-second between calls
        // costs us nothing and avoids bursts.
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    this.logger.log(`Adzuna fetched ${collected.size} unique postings across ${searchTerms.length} term(s)`);
    return [...collected.entries()].map(([externalId, payload]) => ({ externalId, payload }));
  }

  /**
   * Targeted per-state fetch. Invoked by the state-fill coverage endpoint
   * for states that currently have fewer jobs than the configured floor.
   * Uses Adzuna's `where` parameter so results are localized — the keyword
   * passes on their own tend to favor whichever metros dominate the
   * catalog. Returns raw payloads in the same shape as fetch().
   */
  async fetchForStates(stateNames: string[]): Promise<RawJobPayload[]> {
    const appId = this.config.get<string>('ADZUNA_APP_ID');
    const appKey = this.config.get<string>('ADZUNA_APP_KEY');
    if (!appId || !appKey) {
      this.logger.warn('ADZUNA_APP_ID or ADZUNA_APP_KEY missing — skipping state fill');
      return [];
    }
    const country = (this.config.get<string>('ADZUNA_COUNTRY') ?? 'us').toLowerCase();
    const pages = Number(this.config.get<string>('ADZUNA_STATE_FILL_PAGES') ?? '1');
    const collected = new Map<string, unknown>();

    for (const stateName of stateNames) {
      for (let page = 1; page <= pages; page++) {
        const url = new URL(`${this.base}/${country}/search/${page}`);
        url.searchParams.set('app_id', appId);
        url.searchParams.set('app_key', appKey);
        url.searchParams.set('results_per_page', '50');
        url.searchParams.set('content-type', 'application/json');
        url.searchParams.set('where', stateName);

        try {
          const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
          if (!res.ok) {
            this.logger.warn(`Adzuna state-fill ${res.status} for "${stateName}" p${page}`);
            break;
          }
          const body = (await res.json()) as AdzunaSearchResponse;
          const items = body?.results ?? [];
          for (const item of items) {
            if (item?.id && !collected.has(String(item.id))) {
              collected.set(String(item.id), item);
            }
          }
          if (items.length < 50) break;
        } catch (err) {
          this.logger.warn(`Adzuna state-fill failed for "${stateName}" p${page}: ${(err as Error).message}`);
          break;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    this.logger.log(`Adzuna state-fill fetched ${collected.size} unique postings across ${stateNames.length} state(s)`);
    return [...collected.entries()].map(([externalId, payload]) => ({ externalId, payload }));
  }

  normalize(raw: unknown): CanonicalJob {
    const r = raw as AdzunaJob;

    // Adzuna's `location.area` is a breadcrumb array, roughly
    //   ["US", "<State>", "<County>", "<City>"].
    // State is almost always index 1 for US postings; city is the last.
    const area = r.location?.area ?? [];
    const stateRaw = area.length > 1 ? area[1] : null;
    const city =
      area.length > 2 ? area[area.length - 1] : r.location?.display_name ?? null;

    const rawDesc = r.description ?? '';
    // Adzuna descriptions are usually plain text (occasionally ellipsized).
    // If we see any HTML tag, pass through untouched; else paragraphize.
    const descriptionHtml = /<[a-z][^>]*>/i.test(rawDesc)
      ? rawDesc
      : plainTextToHtml(rawDesc);

    return {
      externalId: String(r.id),
      title: r.title ?? '',
      company: r.company?.display_name ?? 'Unknown employer',
      description: rawDesc,
      descriptionHtml,
      applyUrl: r.redirect_url ?? '',
      locationCity:       city,
      locationRegion:     normalizeUsRegion(stateRaw),
      locationPostalCode: null, // Adzuna doesn't return ZIP at this endpoint
      locationCountry:    'US',
      remote:             /remote|work from home|wfh/i.test((r.title ?? '') + ' ' + (r.description ?? '')),
      employmentType:     this.toEmploymentType(r.contract_time, r.contract_type),
      industry:           null, // classifier fills this from text
      salaryMin:          this.roundMoney(r.salary_min),
      salaryMax:          this.roundMoney(r.salary_max),
      salaryCurrency:     'USD',
      requiredSkills:         [],
      requiredCertifications: [],
      minYearsExperience:     null,
      postedAt:  r.created ? new Date(r.created) : null,
      expiresAt: null,
    };
  }

  private roundMoney(v: number | null | undefined): number | null {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    return Math.round(v);
  }

  private toEmploymentType(time?: string, type?: string): EmploymentType {
    if (time === 'full_time') return EmploymentType.FULL_TIME;
    if (time === 'part_time') return EmploymentType.PART_TIME;
    if (type === 'contract')  return EmploymentType.CONTRACT;
    return EmploymentType.OTHER;
  }
}

// ───────── minimal typing of the Adzuna response ─────────

interface AdzunaSearchResponse {
  count?: number;
  results?: AdzunaJob[];
}

interface AdzunaJob {
  id?: string | number;
  title?: string;
  description?: string;
  redirect_url?: string;
  created?: string;
  company?: { display_name?: string };
  location?: { area?: string[]; display_name?: string };
  category?: { tag?: string; label?: string };
  contract_time?: string; // "full_time" | "part_time"
  contract_type?: string; // "permanent" | "contract"
  salary_min?: number;
  salary_max?: number;
  latitude?: number;
  longitude?: number;
}
