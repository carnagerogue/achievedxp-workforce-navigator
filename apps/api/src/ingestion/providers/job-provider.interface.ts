import { EmploymentType } from '@prisma/client';

/**
 * Canonical shape produced by every provider's `normalize()`.
 * This is the stable contract — new sources plug in by mapping their
 * native payload to this shape. Nothing in the core pipeline depends on
 * the raw provider format beyond this.
 */
export interface CanonicalJob {
  externalId: string;
  title: string;
  company: string;
  description: string;
  /**
   * Rich HTML form of the description. When a provider can give us structured
   * content (USAJobs' MajorDuties arrays, Adzuna's HTML, Remotive's HTML),
   * populating this lets the UI preserve bullet lists and section headings.
   * Sanitized server-side before persistence.
   */
  descriptionHtml?: string | null;
  applyUrl: string;

  locationCity?: string | null;
  locationRegion?: string | null;
  locationPostalCode?: string | null;
  locationCountry?: string | null;
  remote?: boolean;

  employmentType?: EmploymentType;
  industry?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;

  requiredSkills?: string[];
  requiredCertifications?: string[];
  minYearsExperience?: number | null;

  postedAt?: Date | null;
  expiresAt?: Date | null;
}

/**
 * A raw payload as returned by the source, paired with its external id.
 * Storing the raw payload as-is in `job_raw_ingestion` lets us re-normalize
 * later if parsing rules change — we don't lose source fidelity.
 */
export interface RawJobPayload {
  externalId: string;
  payload: unknown;
}

/**
 * Every job source implements this. Registered providers are discovered by
 * the IngestionService; adding a new source = add one class + one seed row.
 */
export interface JobProvider {
  /** Matches `job_sources.code` in the DB. */
  readonly code: string;

  /** Pull a page (or all) raw postings from the source. */
  fetch(): Promise<RawJobPayload[]>;

  /** Map a raw payload to the canonical job shape. Pure function. */
  normalize(raw: unknown): CanonicalJob;
}

export const JOB_PROVIDERS = Symbol('JOB_PROVIDERS');
