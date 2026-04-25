import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentType } from '@prisma/client';
import { CanonicalJob, JobProvider, RawJobPayload } from './job-provider.interface';
import { normalizeUsRegion } from '../../location/us-states';

/**
 * USAJobs Search API provider — real federal job postings.
 *
 * API docs:  https://developer.usajobs.gov/API-Reference/GET-api-Search
 * Quota:     generous for registered keys; we stay polite (1 req/s, small
 *            page count per run).
 *
 * Authentication headers (all required by USAJobs):
 *   Host:              data.usajobs.gov
 *   User-Agent:        <email the key was registered with>
 *   Authorization-Key: <API key>
 *
 * Fit for this product: federal roles are Fair Chance Act compliant by
 * policy, so by default `excludesFelons=false`. The classifier still runs
 * downstream and will flip the flag if the posting text includes explicit
 * exclusion language (rare but possible for law-enforcement roles).
 */
@Injectable()
export class UsajobsProvider implements JobProvider {
  readonly code = 'usajobs';

  private readonly logger = new Logger(UsajobsProvider.name);
  private readonly endpoint = 'https://data.usajobs.gov/api/search';

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<RawJobPayload[]> {
    const apiKey = this.config.get<string>('USAJOBS_API_KEY');
    const userAgent = this.config.get<string>('USAJOBS_USER_AGENT');
    if (!apiKey || !userAgent) {
      this.logger.warn('USAJOBS_API_KEY or USAJOBS_USER_AGENT missing — skipping fetch');
      return [];
    }

    const keywords = (this.config.get<string>('USAJOBS_KEYWORDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const maxPages = Number(this.config.get<string>('USAJOBS_MAX_PAGES') ?? '4');

    // Run one query per keyword and combine. Dedup happens downstream via
    // the pipeline's (sourceId, externalId) unique — federal postings have
    // stable PositionIDs — so the same posting returned by two keywords is
    // stored once.
    const collected = new Map<string, unknown>();
    const searchTerms = keywords.length > 0 ? keywords : [''];

    for (const term of searchTerms) {
      for (let page = 1; page <= maxPages; page++) {
        const url = new URL(this.endpoint);
        if (term) url.searchParams.set('Keyword', term);
        url.searchParams.set('ResultsPerPage', '25');
        url.searchParams.set('Page', String(page));
        url.searchParams.set('Fields', 'Full');

        try {
          const res = await fetch(url.toString(), {
            headers: {
              Host: 'data.usajobs.gov',
              'User-Agent': userAgent,
              'Authorization-Key': apiKey,
            },
          });
          if (!res.ok) {
            this.logger.warn(`USAJobs ${res.status} for "${term}" p${page}: ${await res.text().catch(() => '')}`);
            break;
          }
          const body = (await res.json()) as UsajobsSearchResponse;
          const items = body?.SearchResult?.SearchResultItems ?? [];
          for (const item of items) {
            const d = item?.MatchedObjectDescriptor;
            if (!d?.PositionID) continue;

            // Skip non-US postings — the scorer's region/ZIP logic is US-only.
            // Phase 4 can relax this if we start serving international users.
            const firstLoc = d.PositionLocation?.[0];
            const us = !firstLoc?.CountryCode || firstLoc.CountryCode === 'United States';
            if (!us) continue;

            if (!collected.has(d.PositionID)) collected.set(d.PositionID, item);
          }
          if (items.length < 25) break; // short page = end of results for this term
        } catch (err) {
          this.logger.warn(`USAJobs fetch failed for "${term}" p${page}: ${(err as Error).message}`);
          break;
        }

        // Polite pacing — USAJobs isn't rate-strict but we shouldn't hammer.
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    this.logger.log(`USAJobs fetched ${collected.size} unique postings across ${searchTerms.length} term(s)`);
    return [...collected.entries()].map(([externalId, payload]) => ({ externalId, payload }));
  }

  normalize(raw: unknown): CanonicalJob {
    const item = raw as UsajobsResultItem;
    const d = item.MatchedObjectDescriptor;

    const loc = d.PositionLocation?.[0];
    const remun = d.PositionRemuneration?.[0];
    const schedule = d.PositionSchedule?.[0]?.Code;
    const details = d.UserArea?.Details ?? {};

    // Compose structured HTML. Each section maps directly to a tab on the
    // USAJobs posting page ("Duties", "Qualifications", "How you will be
    // evaluated"). The sanitizer will drop anything unsafe downstream.
    const htmlSections: string[] = [];

    const majorDuties = details.MajorDuties ?? [];
    if (majorDuties.length > 0) {
      htmlSections.push('<h3>Duties</h3>');
      htmlSections.push('<ul>');
      for (const duty of majorDuties) htmlSections.push(`<li>${this.escapeText(duty)}</li>`);
      htmlSections.push('</ul>');
    }

    if (d.QualificationSummary) {
      htmlSections.push('<h3>Qualifications</h3>');
      htmlSections.push(this.paragraphize(d.QualificationSummary));
    }

    if (details.Requirements) {
      htmlSections.push('<h3>Requirements</h3>');
      htmlSections.push(this.paragraphize(details.Requirements));
    }

    if (details.Evaluations) {
      htmlSections.push('<h3>How you will be evaluated</h3>');
      htmlSections.push(this.paragraphize(details.Evaluations));
    }

    const descriptionHtml = htmlSections.join('\n') || null;

    // Plain-text fallback for search and environments that can't render HTML.
    const description = [
      d.QualificationSummary,
      ...majorDuties,
      details.Requirements,
      details.Evaluations,
    ]
      .filter(Boolean)
      .join('\n\n');

    // ApplyURI can be an array of multiple application portals; first one
    // is the canonical "Apply" link. Fall back to PositionURI (the posting
    // detail page) if for some reason no apply URL exists.
    const applyUrl =
      (Array.isArray(d.ApplyURI) && d.ApplyURI.length > 0 ? d.ApplyURI[0] : undefined) ??
      d.PositionURI ??
      '';

    return {
      externalId: d.PositionID,
      title: d.PositionTitle,
      company: d.OrganizationName || d.DepartmentName || 'US Federal Government',
      description,
      descriptionHtml,
      applyUrl,
      locationCity:       loc?.CityName ?? null,
      locationRegion:     normalizeUsRegion(loc?.CountrySubDivisionCode ?? null),
      locationPostalCode: null, // USAJobs rarely provides ZIP — leave blank
      locationCountry:    loc?.CountryCode ?? 'US',
      remote:             /telework|remote/i.test(d.PositionTitle + ' ' + (description ?? '')),
      employmentType:     this.toEmploymentType(schedule),
      industry:           null, // classifier fills this from text
      salaryMin:          remun ? this.parseMoney(remun.MinimumRange) : null,
      salaryMax:          remun ? this.parseMoney(remun.MaximumRange) : null,
      salaryCurrency:     'USD',
      requiredSkills:         [],
      requiredCertifications: [],
      minYearsExperience:     null,
      postedAt:  d.PositionStartDate ? new Date(d.PositionStartDate) : null,
      expiresAt: d.PositionEndDate   ? new Date(d.PositionEndDate)   : null,
    };
  }

  /** Escape raw user text for insertion inside HTML element content. */
  private escapeText(t: string): string {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * USAJobs' Requirements / Evaluations / QualificationSummary fields arrive
   * as HTML sometimes, plain text sometimes. If we see tags, trust them
   * (sanitizer strips unsafe ones); otherwise wrap paragraphs manually.
   */
  private paragraphize(raw: string): string {
    if (/<[a-z][^>]*>/i.test(raw)) return raw;
    return raw
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${this.escapeText(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  private parseMoney(raw?: string): number | null {
    if (!raw) return null;
    const n = Number(String(raw).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  /** USAJobs PositionSchedule.Code → our EmploymentType enum. */
  private toEmploymentType(code?: string): EmploymentType {
    switch (code) {
      case '1': return EmploymentType.FULL_TIME;
      case '2': return EmploymentType.PART_TIME;
      case '3': return EmploymentType.CONTRACT;        // Shift work / intermittent
      case '6': return EmploymentType.INTERNSHIP;
      default:  return EmploymentType.OTHER;
    }
  }
}

// ───────── minimal typing of the USAJobs response ─────────
// (Full schema is large; we only grab what we consume.)

interface UsajobsSearchResponse {
  SearchResult?: {
    SearchResultCount?: number;
    SearchResultItems?: UsajobsResultItem[];
  };
}

interface UsajobsResultItem {
  MatchedObjectId?: string;
  MatchedObjectDescriptor: {
    PositionID: string;
    PositionTitle: string;
    PositionURI?: string;
    ApplyURI?: string[];
    OrganizationName?: string;
    DepartmentName?: string;
    QualificationSummary?: string;
    PositionStartDate?: string;
    PositionEndDate?: string;
    PositionLocation?: Array<{
      LocationName?: string;
      CityName?: string;
      CountrySubDivisionCode?: string;
      CountryCode?: string;
    }>;
    PositionRemuneration?: Array<{
      MinimumRange?: string;
      MaximumRange?: string;
      RateIntervalCode?: string;
    }>;
    PositionSchedule?: Array<{ Name?: string; Code?: string }>;
    UserArea?: {
      Details?: {
        MajorDuties?: string[];
        Requirements?: string;
        Evaluations?: string;
      };
    };
  };
}
