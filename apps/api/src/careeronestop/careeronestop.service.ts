import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Wrapper around the U.S. Department of Labor's CareerOneStop public API.
 *
 * Why we centralize this:
 *   - Credentials stay server-side. The token never reaches the browser.
 *   - One in-memory TTL cache keeps us within free-tier quota and gives the
 *     UI sub-100ms responses on repeat lookups (typical: same ZIP queried
 *     for both reentry programs and job centers).
 *   - One place to do graceful degradation. If CareerOneStop is down, every
 *     consumer page still works — the UI just shows an empty result instead
 *     of crashing the whole experience.
 *
 * API docs:  https://www.careeronestop.org/Developers/WebAPI/web-api.aspx
 * Explorer:  https://api.careeronestop.org/api-explorer/
 * Auth:      Authorization: Bearer <token>; userId is in the URL path.
 *
 * Notable shape oddities (verified live against the real API):
 *   - "404 Not Found" sometimes means "no records matched" — check the
 *     response body for `[ { Error: "...no matches..." } ]` rather than
 *     treating the HTTP status as fatal.
 *   - `comparesalaries/.../wage` (singular, not "wages") with query
 *     parameters — different from the path-style most endpoints use.
 *   - `ajcfinder` requires the four service-filter slots even when unused
 *     (pass "0" to disable each filter).
 */
@Injectable()
export class CareerOneStopService {
  private readonly logger = new Logger(CareerOneStopService.name);
  private readonly baseUrl = 'https://api.careeronestop.org/v1';

  // Endpoint-specific TTLs. LMI (wages, licenses) is essentially static
  // government data, so cache aggressively. Reentry programs change rarely
  // but might add new orgs, so 6h is a reasonable upper bound.
  private readonly cache = new Map<string, { expires: number; data: unknown }>();

  constructor(private readonly config: ConfigService) {}

  // ──────────────────── HTTP plumbing ────────────────────

  private get userId(): string {
    return this.config.get<string>('COS_USER_ID') ?? '';
  }
  private get token(): string {
    return this.config.get<string>('COS_TOKEN') ?? '';
  }
  private isConfigured(): boolean {
    return Boolean(this.userId && this.token);
  }

  private async fetchJson<T>(path: string, ttlMs: number): Promise<T> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'CareerOneStop is not configured. Set COS_USER_ID and COS_TOKEN in env.',
      );
    }

    const cacheKey = path;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > now) {
      return cached.data as T;
    }

    const url = `${this.baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
      });
      // CareerOneStop's "no matches" response is a 404 with a JSON body —
      // try to parse it before treating as a hard failure.
      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (data === null || data === undefined) {
        // True hard error (HTML 404, network error, etc.). Cache briefly so
        // we don't hammer on a known-bad query.
        this.logger.warn(`CareerOneStop ${res.status} on ${path}: ${text.slice(0, 160)}`);
        const fallback = { error: `${res.status} ${res.statusText}`, partial: true } as T;
        this.cache.set(cacheKey, { expires: now + 60_000, data: fallback });
        return fallback;
      }

      this.cache.set(cacheKey, { expires: now + ttlMs, data });
      return data as T;
    } catch (err) {
      this.logger.warn(`CareerOneStop fetch failed for ${path}: ${(err as Error).message}`);
      throw new ServiceUnavailableException('CareerOneStop is unreachable right now');
    }
  }

  /** URL-encode a path segment safely. */
  private seg(s: string): string {
    return encodeURIComponent(s.trim());
  }

  // ──────────────────── Reentry programs ────────────────────

  /**
   * Find programs that serve justice-impacted candidates near a location.
   * `location` accepts ZIP, city, "City, ST", or state code. Radius in miles.
   * Endpoint: /v1/reentryprogramfinder/{userId}/{location}/{radius}/{sort}/{dir}/{start}/{limit}
   */
  async reentryPrograms(location: string, radius = 50, limit = 25) {
    const path = `/reentryprogramfinder/${this.seg(this.userId)}/${this.seg(location)}/${radius}/CountyName/asc/0/${limit}`;
    return this.fetchJson<unknown>(path, 6 * 60 * 60_000); // 6h
  }

  // ──────────────────── American Job Centers ────────────────────

  /**
   * Physical workforce offices — free in-person help with applications,
   * training, benefits.
   * Endpoint: /v1/ajcfinder/{userId}/{location}/{radius}/{centerType}/{youth}/{workers}/{business}/{sort}/{dir}/{start}/{limit}
   *
   * Service-filter slots take "0" to disable. We disable all four by
   * default so the response includes every center near the user.
   */
  async americanJobCenters(location: string, radius = 50, limit = 25) {
    const path = `/ajcfinder/${this.seg(this.userId)}/${this.seg(location)}/${radius}/0/0/0/0/Distance/asc/0/${limit}`;
    return this.fetchJson<unknown>(path, 6 * 60 * 60_000);
  }

  // ──────────────────── Apprenticeship sponsors ────────────────────

  /** Search apprenticeships by keyword + location. Supplements posting-based ingestion. */
  async apprenticeships(keyword: string, location: string, radius = 50, limit = 25) {
    const k = this.seg(keyword || 'a');
    const path = `/apprenticeship/${this.seg(this.userId)}/${k}/${this.seg(location)}/${radius}/programName/asc/0/${limit}/false`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  // ──────────────────── Wages (LMI) ────────────────────

  /**
   * Median + percentile wages for an O*NET occupation, optionally per state.
   * Returns BLS data — authoritative numbers we can show with confidence
   * on occupation cards.
   *
   * Endpoint: /v1/comparesalaries/{userId}/wage?keyword=&location=&enableMetaData=false
   * NOTE: path is `wage` (singular), not `wages`.
   */
  async wages(onetCodeOrKeyword: string, location?: string) {
    const where = location && location.trim() ? location.trim() : 'US';
    const params = new URLSearchParams({
      keyword: onetCodeOrKeyword,
      location: where,
      enableMetaData: 'false',
    });
    const path = `/comparesalaries/${this.seg(this.userId)}/wage?${params.toString()}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  // ──────────────────── License finder ────────────────────

  /**
   * State licensing requirements for an occupation. Especially important
   * for justice-impacted candidates — many state licenses can be denied
   * based on conviction history. Surfacing this upfront prevents the
   * candidate from investing in a path that's blocked for them.
   *
   * Endpoint: /v1/license/{userId}/{keyword}/{location}/{sort}/{dir}/{start}/{limit}
   */
  async licenses(keyword: string, location: string, limit = 25) {
    const path = `/license/${this.seg(this.userId)}/${this.seg(keyword)}/${this.seg(location || 'US')}/Title/asc/0/${limit}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  // ──────────────────── Certification finder ────────────────────

  /**
   * Industry-recognized certifications by keyword.
   * Endpoint: /v1/certificationfinder/{userId}/{keyword}/{industry?}/{occupation?}/{agency?}/{search type?}/{search content?}/{sort}/{start}/{limit}/{enableMetaData}
   *
   * Most fields are 0/empty to broaden the search. Tighten the slots when
   * we surface industry-specific cert recommendations on the dashboard.
   */
  async certifications(keyword: string, limit = 15) {
    const path = `/certificationfinder/${this.seg(this.userId)}/${this.seg(keyword)}/0/0/0/0/0/0/0/${limit}/false`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  // ──────────────────── Skills matcher ────────────────────

  /**
   * The Skills Matcher endpoint returns the 40 standard skills statements
   * that drive the official CareerOneStop matcher. Pair this with our
   * O*NET Holland-code matcher rather than replacing it.
   * Endpoint: /v1/skillsmatcher/{userId}
   */
  async skillsMatcherQuestions() {
    const path = `/skillsmatcher/${this.seg(this.userId)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  // ──────────────────── Occupation profile ────────────────────

  /**
   * Rich occupation report — tasks, knowledge, skills, abilities, related
   * links. The flag string toggles which sections come back; we ask for
   * most of them but skip rarely-used ones.
   */
  async occupationProfile(onetCode: string, location = 'US') {
    const path = `/occupation/${this.seg(this.userId)}/${this.seg(onetCode)}/${this.seg(location)}/Y/Y/Y/Y/Y/Y/Y/Y/Y/0/10/false`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }
}
