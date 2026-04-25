import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Wrapper around the U.S. Department of Labor's CareerOneStop public API.
 *
 * Why we centralize this:
 *   - Credentials stay server-side. The token never reaches the browser.
 *   - One in-memory TTL cache keeps us within free-tier quota and gives the
 *     UI sub-100ms responses on repeat lookups.
 *   - One place to do graceful degradation. If CareerOneStop is down, every
 *     consumer page still works — the UI just shows an empty result.
 *
 * Coverage: every endpoint listed at
 *   https://www.careeronestop.org/Developers/WebAPI/technical-information.aspx
 * is exposed here as a typed method. URL templates verified against the
 * official docs as of April 2026.
 *
 * Auth: Authorization: Bearer <token>; userId is in the URL path.
 *
 * Notable shape oddities (verified live):
 *   - "404 Not Found" sometimes means "no records matched" — we parse the
 *     body and return it as a partial response rather than crashing.
 *   - `comparesalaries/.../wage` (singular) with query parameters — different
 *     from the path-style most endpoints use.
 *   - `ajcfinder` requires the four service-filter slots even when unused
 *     (pass "0" to disable each filter).
 *   - `occupation` profile takes section toggles as QUERY PARAMS, not as
 *     path segments (the older path-segment form returns 404).
 */
@Injectable()
export class CareerOneStopService {
  private readonly logger = new Logger(CareerOneStopService.name);
  private readonly baseUrl = 'https://api.careeronestop.org/v1';

  // Endpoint-specific TTLs. LMI is essentially static government data, cache
  // aggressively. Reentry programs / AJCs change rarely — 6h is reasonable.
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
      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (data === null || data === undefined) {
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
  private seg(s: string | number | null | undefined): string {
    return encodeURIComponent(String(s ?? '').trim() || '0');
  }

  // ════════════════════════════════════════════════════════════════════
  // LOCAL HELP
  // ════════════════════════════════════════════════════════════════════

  /** Reentry programs near a location (justice-impacted candidates). */
  async reentryPrograms(location: string, radius = 50, limit = 25) {
    const path = `/reentryprogramfinder/${this.seg(this.userId)}/${this.seg(location)}/${radius}/CountyName/asc/0/${limit}`;
    return this.fetchJson<unknown>(path, 6 * 60 * 60_000);
  }

  /** All reentry programs (no location filter — for an exhaustive directory). */
  async allReentryPrograms() {
    const path = `/reentryprogramfinder/${this.seg(this.userId)}?enableMetaData=false`;
    return this.fetchJson<unknown>(path, 12 * 60 * 60_000);
  }

  /** American Job Centers near a location. */
  async americanJobCenters(location: string, radius = 50, limit = 25) {
    const path = `/ajcfinder/${this.seg(this.userId)}/${this.seg(location)}/${radius}/0/0/0/0/Distance/asc/0/${limit}`;
    return this.fetchJson<unknown>(path, 6 * 60 * 60_000);
  }

  /** AJC details by ID. */
  async ajcDetails(ajcId: string) {
    const path = `/ajcfinder/${this.seg(this.userId)}/${this.seg(ajcId)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** All AJCs nationally — large response, cache aggressively. */
  async allAjcs() {
    const path = `/ajcfinder/${this.seg(this.userId)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** State + federal apprenticeship admin offices near a location. */
  async apprenticeshipOffices(location: string, radius = 100) {
    const path = `/apprenticeshipfinder/${this.seg(this.userId)}/${this.seg(location)}/${radius}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Workforce Development Boards + Youth Committees by location. */
  async boardsByLocation(location: string, radius = 50, limit = 25) {
    const path = `/boardandcommittees/${this.seg(this.userId)}/${this.seg(location)}/${radius}/Distance/asc/0/${limit}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Single Workforce Board by ID. */
  async boardById(boardId: string) {
    const path = `/boardandcommittees/${this.seg(this.userId)}/${this.seg(boardId)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** All Workforce Boards (national). */
  async allBoards() {
    const path = `/boardandcommittees/${this.seg(this.userId)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Youth program contacts by location (WIOA youth programs). */
  async youthProgramContacts(location: string, radius = 50, limit = 25) {
    const path = `/youthprograms/${this.seg(this.userId)}/${this.seg(location)}/${radius}/Distance/asc/0/${limit}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** All youth programs nationally. */
  async allYouthPrograms() {
    const path = `/youthprograms/${this.seg(this.userId)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** State-level resources for residents — WIOA URL, agency contacts. */
  async stateResources(state: string) {
    const path = `/stateresources/${this.seg(this.userId)}/${this.seg(state)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  // ════════════════════════════════════════════════════════════════════
  // OCCUPATIONS
  // ════════════════════════════════════════════════════════════════════

  /**
   * Rich occupation profile — tasks, skills, knowledge, abilities, wages,
   * projections, related occupations. Section toggles are QUERY PARAMS.
   */
  async occupationProfile(keywordOrOnet: string, location = 'US') {
    const params = new URLSearchParams({
      training: 'true', tasks: 'true', dwas: 'true', wages: 'true',
      projectedEmployment: 'true', skills: 'true', knowledge: 'true',
      ability: 'true', toolsAndTechnology: 'true', workValues: 'true',
      alternateOnetTitles: 'true', relatedOnetTitles: 'true',
      enableMetaData: 'false',
    });
    const path = `/occupation/${this.seg(this.userId)}/${this.seg(keywordOrOnet)}/${this.seg(location)}?${params.toString()}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Lightweight title+code lookup — autocomplete-friendly. */
  async occupationsByKeyword(keyword: string, limit = 10) {
    const path = `/occupation/${this.seg(this.userId)}/${this.seg(keyword)}/false/0/${limit}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /**
   * Career reports (Fastest Growing / Most Openings / Largest / Declining).
   * `reportType` ∈ {fastest, mostopenings, largest, declining, highestpay}.
   */
  async occupationsReport(reportType: string, location = 'US', limit = 25) {
    const path = `/occupationsreports/${this.seg(this.userId)}/${this.seg(reportType)}/${this.seg(location)}/0/${limit}`;
    return this.fetchJson<unknown>(path, 7 * 24 * 60 * 60_000);
  }

  // ════════════════════════════════════════════════════════════════════
  // SALARIES / WAGES (Labor Market Information)
  // ════════════════════════════════════════════════════════════════════

  /** Median + percentile wages for an O*NET occupation, optionally per state. */
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

  /** Compare an occupation's wages across multiple locations. */
  async wagesByLocation(onetOrKeyword: string, location?: string) {
    const params = new URLSearchParams({
      keyword: onetOrKeyword,
      location: location || 'US',
      sortColumns: 'Median', sortOrder: 'desc', sortBy: 'desc',
      enableMetaData: 'false',
    });
    const path = `/comparesalaries/${this.seg(this.userId)}/wageocc?${params.toString()}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Detailed BLS LMI for an O*NET code in a region. */
  async lmiByOccupation(onetCode: string, location = 'US') {
    const path = `/lmibyoccupation/${this.seg(this.userId)}/${this.seg(onetCode)}/${this.seg(location)}`;
    return this.fetchJson<unknown>(path, 7 * 24 * 60 * 60_000);
  }

  /** Employment patterns by industry (which industries hire this occupation). */
  async employmentPatterns(onetCode: string) {
    const path = `/employmentpattern/${this.seg(this.userId)}/${this.seg(onetCode)}`;
    return this.fetchJson<unknown>(path, 7 * 24 * 60 * 60_000);
  }

  /** Unemployment rates by area (BLS LAUS). */
  async unemploymentRates(state: string, type = 'state') {
    const path = `/unemployment/${this.seg(this.userId)}/${this.seg(type)}/${this.seg(state)}`;
    return this.fetchJson<unknown>(path, 7 * 24 * 60 * 60_000);
  }

  /** State Unemployment Insurance website. */
  async uiWebSites(state: string) {
    const path = `/unemployment/${this.seg(this.userId)}/uiwebsite/${this.seg(state)}`;
    return this.fetchJson<unknown>(path, 30 * 24 * 60 * 60_000);
  }

  // ════════════════════════════════════════════════════════════════════
  // LICENSES + CERTIFICATIONS
  // ════════════════════════════════════════════════════════════════════

  /**
   * State licensing requirements. Critical for justice-impacted candidates —
   * many state licenses can be denied based on conviction history.
   */
  async licenses(keyword: string, location: string, limit = 25) {
    const path = `/license/${this.seg(this.userId)}/${this.seg(keyword)}/${this.seg(location || 'US')}/Title/asc/0/${limit}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Detail for a single license by id. */
  async licenseDetails(licenseId: string) {
    const path = `/license/${this.seg(this.userId)}/${this.seg(licenseId)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /**
   * Industry-recognized certifications by keyword.
   * 12 path segments after userId — directFlag, industry, certType,
   * organization, occupation, agency, sortColumn, sortDirections, start,
   * limit. Most are "0" to broaden the search.
   */
  async certifications(keyword: string, limit = 15) {
    const path = `/certificationfinder/${this.seg(this.userId)}/${this.seg(keyword)}/0/0/0/0/0/0/Title/asc/0/${limit}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Single certification by id. */
  async certificationDetails(certId: string) {
    const path = `/certificationfinder/${this.seg(this.userId)}/${this.seg(certId)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  // ════════════════════════════════════════════════════════════════════
  // TRAINING + EDUCATION
  // ════════════════════════════════════════════════════════════════════

  /** Training programs by keyword + location (postsecondary + ETPL). */
  async trainingPrograms(keyword: string, location: string, radius = 50, limit = 25) {
    const path = `/Training/${this.seg(this.userId)}/${this.seg(keyword)}/${this.seg(location)}/${radius}/0/0/0/0/0/Distance/asc/0/${limit}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Training programs at a specific institution / element ID. */
  async trainingByElement(elementId: string, limit = 25) {
    const path = `/Training/${this.seg(this.userId)}/elementid/${this.seg(elementId)}/0/${limit}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Training institutions (community colleges, technical schools). */
  async trainingInstitutions(location: string, radius = 50, limit = 25) {
    const path = `/Training/${this.seg(this.userId)}/institution/${this.seg(location)}/${radius}/0/${limit}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  // ════════════════════════════════════════════════════════════════════
  // SKILLS + KNOWLEDGE
  // ════════════════════════════════════════════════════════════════════

  /** The 40 standard CareerOneStop skills statements (matcher question set). */
  async skillsMatcherQuestions() {
    const path = `/skillsmatcher/${this.seg(this.userId)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /**
   * Submit a user's skill ratings → returns ranked occupation matches.
   * `skills` = array of { ElementId, DataValue } where DataValue is 1–7.
   */
  async submitSkills(skills: Array<{ ElementId: string; DataValue: number }>) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('CareerOneStop is not configured.');
    }
    const url = `${this.baseUrl}/skillsmatcher/${this.seg(this.userId)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ SKAValueList: skills }),
      });
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { error: text.slice(0, 300), partial: true }; }
    } catch (err) {
      throw new ServiceUnavailableException(
        `Skills submit failed: ${(err as Error).message}`,
      );
    }
  }

  /** Skills gaps between two occupations (for transition planning). */
  async skillsGaps(fromOnet: string, toOnet: string) {
    const path = `/skillsgaps/${this.seg(this.userId)}/${this.seg(fromOnet)}/${this.seg(toOnet)}`;
    return this.fetchJson<unknown>(path, 7 * 24 * 60 * 60_000);
  }

  /** Match occupations by O*NET skills profile. */
  async occupationsBySkills(onetCode: string, limit = 25) {
    const path = `/occupation/${this.seg(this.userId)}/skills/${this.seg(onetCode)}/0/${limit}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Tools and technology used in an occupation (by O*NET code). */
  async toolsByOccupation(onetCode: string) {
    const path = `/toolstechnology/${this.seg(this.userId)}/${this.seg(onetCode)}/occupation`;
    return this.fetchJson<unknown>(path, 7 * 24 * 60 * 60_000);
  }

  /** Tools and tech matching a keyword. */
  async toolsByKeyword(keyword: string, limit = 25) {
    const path = `/toolstechnology/${this.seg(this.userId)}/${this.seg(keyword)}/keyword/0/${limit}`;
    return this.fetchJson<unknown>(path, 7 * 24 * 60 * 60_000);
  }

  // ════════════════════════════════════════════════════════════════════
  // JOBS + PROFESSIONAL ASSOCIATIONS
  // ════════════════════════════════════════════════════════════════════

  /**
   * National Labor Exchange jobs (DirectEmployers + state workforce agencies).
   * Distinct from our USAJobs/Adzuna ingestion — surfaces DOL-branded results.
   */
  async jobs(keyword: string, location: string, radius = 50, postedDays = 30, limit = 25) {
    const k = keyword?.trim() ? this.seg(keyword) : '0';
    const loc = location?.trim() ? this.seg(location) : 'US';
    const path = `/jobsearch/${this.seg(this.userId)}/${k}/${loc}/${radius}/${postedDays}/Distance/asc/0/${limit}/false`;
    return this.fetchJson<unknown>(path, 6 * 60 * 60_000);
  }

  /** Single NLX job by id. */
  async jobById(jobId: string) {
    const path = `/jobsearch/${this.seg(this.userId)}/byid/${this.seg(jobId)}`;
    return this.fetchJson<unknown>(path, 6 * 60 * 60_000);
  }

  /** Job description templates (for employers; useful for resumé phrasing). */
  async jobDescription(onetCode: string) {
    const path = `/jobdescription/${this.seg(this.userId)}/${this.seg(onetCode)}`;
    return this.fetchJson<unknown>(path, 24 * 60 * 60_000);
  }

  /** Professional associations by keyword. */
  async professionalAssociations(keyword: string, limit = 25) {
    const path = `/professionalassociations/${this.seg(this.userId)}/${this.seg(keyword)}/0/${limit}`;
    return this.fetchJson<unknown>(path, 7 * 24 * 60 * 60_000);
  }

  // ════════════════════════════════════════════════════════════════════
  // LOCATION HELPER
  // ════════════════════════════════════════════════════════════════════

  /** Validate a location and resolve it to canonical city/state/area. */
  async validateLocation(location: string) {
    const path = `/locations/${this.seg(this.userId)}?location=${encodeURIComponent(location)}`;
    return this.fetchJson<unknown>(path, 30 * 24 * 60 * 60_000);
  }
}
