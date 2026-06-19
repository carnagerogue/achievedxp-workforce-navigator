/**
 * Job classification + data-quality engine.
 *
 * Separates SOURCE-PROVIDED facts from INFERRED classifications and attaches a
 * confidence to every inferred label (`verified` | `inferred` | `uncertain`),
 * each traceable to a rule or source field. Replaces the old keyword-only
 * classifier so we never:
 *   - call a senior/management role an apprenticeship,
 *   - call a clearance / security-sensitive role second-chance friendly,
 *   - present a duplicated/garbled location, or
 *   - state a label as fact when the posting is too sparse to support it.
 *
 * Pure + dependency-free so the provider layer, route handlers, and tests all
 * share it.
 */
import type { RiskTier } from '../index';

// ── Confidence + provenance ───────────────────────────────────────────────
export type FieldConfidence = 'verified' | 'inferred' | 'uncertain';

export interface ClassifiedField<T> {
  value: T;
  confidence: FieldConfidence;
  /** Human-readable rule or source field that produced this value. */
  basis: string;
}

export type ApprenticeshipType =
  | 'registered'        // verified registered apprenticeship (source flag or strong signal)
  | 'pre_apprenticeship'
  | 'entry_pathway'     // entry-level role that builds toward a trade
  | 'unverified'        // apprenticeship-ish language, not confirmed
  | 'none';

export interface JobClassificationMeta {
  industry: ClassifiedField<string | null>;
  apprenticeship: ClassifiedField<ApprenticeshipType>;
  excludesFelons: ClassifiedField<boolean>;
  /** True only when the posting explicitly states fair/second-chance hiring. */
  fairChance: ClassifiedField<boolean>;
  backgroundCheckLikely: ClassifiedField<boolean>;
  riskTier: ClassifiedField<RiskTier>;
  /** Posting was too sparse to classify with confidence. */
  dataComplete: boolean;
}

export interface ClassifyJobInput {
  title: string;
  description: string;
  company: string;
  /** Source-provided category, if any. */
  industryHint?: string | null;
  /** Source-provided apprenticeship flag (e.g. a DOL feed). */
  apprenticeshipSource?: boolean | null;
  remoteHint?: boolean | null;
}

// ── Location normalization ────────────────────────────────────────────────
const US_STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA',
  michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};
const STATE_ABBRS = new Set(Object.values(US_STATES));

export function normalizeRegion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.length === 2 && STATE_ABBRS.has(t.toUpperCase())) return t.toUpperCase();
  const abbr = US_STATES[t.toLowerCase()];
  return abbr ?? t;
}

/** Clean a (city, region) pair: drop a state already baked into the city and
 *  abbreviate the state. Fixes "Iowa City, Iowa" + region "Iowa". */
export function normalizeLocation(
  city: string | null | undefined,
  region: string | null | undefined,
  _country?: string | null,
): { city: string | null; region: string | null } {
  const regionNorm = normalizeRegion(region);
  let cityClean: string | null = (city ?? '').trim() || null;

  if (cityClean) {
    // Split on commas, drop empties, and drop any trailing segment that is the
    // state (full name or abbr) — that's where "Iowa City, Iowa" comes from.
    let segs = cityClean.split(',').map((s) => s.trim()).filter(Boolean);
    segs = segs.filter((s, i) => i === 0 || s.toLowerCase() !== segs[i - 1].toLowerCase());
    while (segs.length > 1) {
      const last = segs[segs.length - 1];
      const lastAbbr = normalizeRegion(last);
      if (last.toLowerCase() === (region ?? '').trim().toLowerCase() || lastAbbr === regionNorm) {
        segs.pop();
      } else break;
    }
    cityClean = segs.join(', ') || null;
  }
  return { city: cityClean, region: regionNorm };
}

/** Deduped display string from parts (defensive against bad source data). */
export function formatLocation(parts: { city?: string | null; region?: string | null; postal?: string | null }): string {
  const out: string[] = [];
  for (const raw of [parts.city, parts.region, parts.postal]) {
    const v = (raw ?? '').trim();
    if (!v) continue;
    if (out.length && out[out.length - 1].toLowerCase() === v.toLowerCase()) continue;
    out.push(v);
  }
  return out.join(', ');
}

// ── Title disqualifiers (never an apprenticeship / entry pathway) ──────────
const SENIOR_TITLE = /\b(senior|sr\.?|lead|principal|staff|manager|mgr|director|vp|vice president|head of|chief|c[etof]o|president|architect|supervisor|executive)\b/i;
const PRODUCT_MGMT = /\b(product|program|project) manager\b/i;

// ── Apprenticeship signals ────────────────────────────────────────────────
const REGISTERED_SIGNALS = /\b(registered apprenticeship|apprenticeship\.gov|dol apprenticeship|earn while you learn|ibew|ua local|carpenters?\s+(local|union)|sheet metal workers|operating engineers|plumbers? (and|&) pipefitters)\b/i;
const PRE_APPRENTICE = /\bpre[- ]apprentice(ship)?\b/i;
const APPRENTICE_WORD = /\bapprentice(ship)?\b/i;
const JOURNEY_WORD = /\bjourney(man|level|worker)\b/i;
// Leading boundary only — must match prefixes like electric→electrician, plumb→plumber.
const TRADE_HINT = /\b(electric|plumb|carpent|hvac|weld|machinist|pipefit|sheet metal|mason|millwright|ironworker|lineman)/i;

export function classifyApprenticeship(input: ClassifyJobInput): ClassifiedField<ApprenticeshipType> {
  const title = (input.title || '').toLowerCase();
  const desc = (input.description || '').toLowerCase();
  const blob = `${title} ${desc}`;

  // Hard disqualifier: senior / management / product-management titles are
  // never apprenticeships, even if the description mentions mentoring them.
  if (SENIOR_TITLE.test(input.title) || PRODUCT_MGMT.test(input.title)) {
    return { value: 'none', confidence: 'verified', basis: 'senior/management title — not an apprenticeship' };
  }

  if (input.apprenticeshipSource === true) {
    return { value: 'registered', confidence: 'verified', basis: 'source apprenticeship feed' };
  }
  if (PRE_APPRENTICE.test(blob)) {
    return { value: 'pre_apprenticeship', confidence: 'inferred', basis: 'matched "pre-apprenticeship"' };
  }
  if (REGISTERED_SIGNALS.test(blob)) {
    return { value: 'registered', confidence: 'inferred', basis: 'registered-apprenticeship / union-local signal' };
  }
  // "apprentice" in the TITLE for a trade role → real apprentice posting.
  if (APPRENTICE_WORD.test(title) && TRADE_HINT.test(blob)) {
    return { value: 'registered', confidence: 'inferred', basis: 'apprentice trade title' };
  }
  // Keyword only in the description, no trade/registered signal → NOT enough.
  if ((APPRENTICE_WORD.test(desc) || JOURNEY_WORD.test(blob)) && !APPRENTICE_WORD.test(title)) {
    return { value: 'none', confidence: 'inferred', basis: 'apprentice mentioned only in description — insufficient' };
  }
  if (APPRENTICE_WORD.test(title)) {
    return { value: 'unverified', confidence: 'uncertain', basis: 'apprentice in title without trade/registered signal' };
  }
  return { value: 'none', confidence: 'verified', basis: 'no apprenticeship signal' };
}

// ── Industry ──────────────────────────────────────────────────────────────
const INDUSTRY_RULES: ReadonlyArray<[string, readonly string[]]> = [
  ['healthcare', ['nurse', 'cna', 'rn', 'lpn', 'medical', 'hospital', 'clinic', 'phlebotom', 'pharmacy', 'patient', 'caregiver']],
  ['government', ['federal', 'gsa', 'va medical', 'state of ', 'county of ', 'civil service']],
  ['transportation', ['cdl', 'truck driver', 'trucking', 'freight', 'delivery driver', 'logistics', 'shipping']],
  ['warehousing', ['warehouse', 'forklift', 'distribution center', 'order picking', 'packing', 'pallet']],
  ['construction', ['carpenter', 'electrician', 'plumber', 'concrete', 'mason', 'framer', 'roofing', 'hvac', 'journeyman']],
  ['manufacturing', ['welder', 'machinist', 'fabricat', 'assembly line', 'production line', 'foundry', 'cnc']],
  ['food_service', ['cook', 'chef', 'kitchen', 'restaurant', 'barista', 'server', 'dishwasher', 'food prep']],
  ['automotive', ['mechanic', 'auto repair', 'tire tech', 'oil change', 'collision repair']],
  ['cleaning', ['janitor', 'custodian', 'housekeep', 'sanitation']],
  ['landscaping', ['landscap', 'groundskeep', 'lawn care', 'tree trimm']],
  ['retail', ['cashier', 'sales associate', 'merchandis', 'stocker']],
  ['it_general', ['software', 'developer', 'sysadmin', 'help desk', 'it support', 'network tech']],
  ['energy_utilities', ['utility', 'lineman', 'oilfield', 'driller', 'powerline', 'wind tech', 'solar install']],
  ['education', ['teacher', 'instructor', 'tutor', 'professor']],
  ['services', ['maintenance', 'janitorial', 'security guard', 'customer service']],
];
const INDUSTRY_NAMES = new Set(INDUSTRY_RULES.map(([n]) => n));

export function classifyIndustry(input: ClassifyJobInput): ClassifiedField<string | null> {
  const hint = (input.industryHint ?? '').trim().toLowerCase();
  if (hint && INDUSTRY_NAMES.has(hint)) {
    return { value: hint, confidence: 'verified', basis: 'source category' };
  }
  const blob = `${input.title} ${input.description}`.toLowerCase();
  for (const [name, kws] of INDUSTRY_RULES) {
    const hit = kws.find((kw) => blob.includes(kw));
    if (hit) return { value: name, confidence: 'inferred', basis: `keyword "${hit}"` };
  }
  if (hint) return { value: hint, confidence: 'uncertain', basis: 'unrecognized source category' };
  return { value: null, confidence: 'uncertain', basis: 'no industry signal' };
}

// ── Eligibility (risk / fair-chance / exclusion) ──────────────────────────
const FEDERAL_EMPLOYER = /\b(department of |dept\.? of |dod|u\.?s\.? (army|navy|air force|marine corps|coast guard|space force)|fbi|cia|nsa|dea|atf|tsa|cbp|usss|us marshals|federal bureau|joint base|fort \w+|naval (station|base)|afb)\b/i;
const SECURITY_ROLE = /\b(police officer|sheriff|deputy|correctional officer|federal agent|prison guard|armed (guard|security)|bank teller|cash handler|loss prevention|armored)\b/i;
const CLEARANCE = /\b(security clearance|secret clearance|top[- ]secret|ts\/sci|public trust|cjis|fingerprint(ing)? required)\b/i;
const CLEAN_RECORD = /\b(clean (background|record) required|no (criminal|felony) record|must pass (a )?background check|spotless record)\b/i;
const FAIR_CHANCE = /\b(fair[- ]chance (employer|hiring)|second[- ]chance (employer|hiring)|justice[- ]impacted|felon[- ]friendly|reentry friendly|we (consider|welcome) applicants with (criminal )?records|ban[- ]the[- ]box)\b/i;
const BG_CHECK = /\b(background (check|investigation)|criminal history (review|check)|drug (test|screen))\b/i;

const HIGH_RISK_INDUSTRY = new Set(['healthcare', 'government', 'education']);
const LOW_RISK_INDUSTRY = new Set(['warehousing', 'construction', 'manufacturing', 'food_service', 'landscaping', 'cleaning', 'automotive', 'energy_utilities']);

interface Eligibility {
  excludesFelons: ClassifiedField<boolean>;
  fairChance: ClassifiedField<boolean>;
  backgroundCheckLikely: ClassifiedField<boolean>;
  riskTier: ClassifiedField<RiskTier>;
}

export function classifyEligibility(input: ClassifyJobInput, industry: string | null): Eligibility {
  const blob = `${input.title} ${input.description} ${input.company}`;
  const clearance = CLEARANCE.test(blob) || FEDERAL_EMPLOYER.test(input.company) || SECURITY_ROLE.test(input.title);
  const cleanRecord = CLEAN_RECORD.test(blob);
  const fairChanceLang = FAIR_CHANCE.test(blob);
  const bg = BG_CHECK.test(blob);

  // Clearance / security-sensitive / clean-record: a hard barrier. Even if the
  // posting ALSO contains fair-chance boilerplate, the clearance wins (and we
  // never call it fair-chance).
  if (clearance || cleanRecord) {
    const basis = clearance ? 'clearance / security-sensitive role' : 'posting requires a clean record';
    return {
      excludesFelons: { value: true, confidence: 'verified', basis },
      fairChance: { value: false, confidence: 'verified', basis: `${basis} — cannot be fair-chance` },
      backgroundCheckLikely: { value: true, confidence: 'verified', basis },
      riskTier: { value: 'HIGH', confidence: 'verified', basis },
    };
  }

  if (fairChanceLang) {
    return {
      excludesFelons: { value: false, confidence: 'verified', basis: 'explicit fair-chance language' },
      fairChance: { value: true, confidence: 'verified', basis: 'posting states fair/second-chance hiring' },
      backgroundCheckLikely: { value: bg, confidence: bg ? 'verified' : 'inferred', basis: bg ? 'mentions background check' : 'no background-check language' },
      riskTier: { value: 'LOW', confidence: 'verified', basis: 'fair-chance employer' },
    };
  }

  if (industry && HIGH_RISK_INDUSTRY.has(industry)) {
    return {
      excludesFelons: { value: true, confidence: 'inferred', basis: `${industry} typically runs strict background checks` },
      fairChance: { value: false, confidence: 'uncertain', basis: 'no fair-chance language; high-background industry' },
      backgroundCheckLikely: { value: true, confidence: 'inferred', basis: `${industry} industry` },
      riskTier: { value: 'HIGH', confidence: 'inferred', basis: `${industry} industry` },
    };
  }

  if (industry && LOW_RISK_INDUSTRY.has(industry)) {
    return {
      excludesFelons: { value: false, confidence: 'inferred', basis: `${industry} has common fair-chance hiring` },
      fairChance: { value: false, confidence: 'uncertain', basis: 'no barrier detected, but fair-chance not confirmed' },
      backgroundCheckLikely: { value: bg, confidence: 'inferred', basis: bg ? 'mentions background check' : `${industry} industry` },
      riskTier: { value: 'LOW', confidence: 'inferred', basis: `${industry} industry` },
    };
  }

  return {
    excludesFelons: { value: false, confidence: 'uncertain', basis: 'no exclusion signal found' },
    fairChance: { value: false, confidence: 'uncertain', basis: 'fair-chance status unknown' },
    backgroundCheckLikely: { value: bg, confidence: bg ? 'inferred' : 'uncertain', basis: bg ? 'mentions background check' : 'unknown' },
    riskTier: { value: 'MEDIUM', confidence: 'uncertain', basis: 'insufficient signal' },
  };
}

// ── Top-level ─────────────────────────────────────────────────────────────
const MIN_DESCRIPTION = 120; // chars — below this, downgrade inferred → uncertain

export function classifyJob(input: ClassifyJobInput): JobClassificationMeta {
  const dataComplete = (input.description || '').trim().length >= MIN_DESCRIPTION;
  const industry = classifyIndustry(input);
  const apprenticeship = classifyApprenticeship(input);
  const eligibility = classifyEligibility(input, industry.value);

  const meta: JobClassificationMeta = {
    industry, apprenticeship, ...eligibility, dataComplete,
  };

  // Overconfidence guard: with a too-sparse posting, no INFERRED label is
  // presented as more than uncertain (verified source facts are kept).
  if (!dataComplete) {
    for (const k of ['industry', 'apprenticeship', 'excludesFelons', 'fairChance', 'backgroundCheckLikely', 'riskTier'] as const) {
      const f = meta[k] as ClassifiedField<unknown>;
      if (f.confidence === 'inferred') {
        f.confidence = 'uncertain';
        f.basis = `${f.basis} (posting too sparse to confirm)`;
      }
    }
  }
  return meta;
}

export const isApprenticeshipType = (t: ApprenticeshipType): boolean =>
  t === 'registered' || t === 'pre_apprenticeship' || t === 'entry_pathway';

// ── QA audit ──────────────────────────────────────────────────────────────
export interface QaIssue { code: string; severity: 'high' | 'medium' | 'low'; message: string }
export interface QaRecord { id: string; title: string; company: string; issues: QaIssue[] }
export interface QaReport { total: number; flaggedCount: number; flagged: QaRecord[] }

export interface AuditableJob {
  id: string;
  title: string;
  company: string;
  description?: string;
  locationCity?: string | null;
  locationRegion?: string | null;
  classification?: JobClassificationMeta;
}

export function auditJob(job: AuditableJob): QaIssue[] {
  const issues: QaIssue[] = [];
  const c = job.classification;
  if (c) {
    if (isApprenticeshipType(c.apprenticeship.value) && (SENIOR_TITLE.test(job.title) || PRODUCT_MGMT.test(job.title))) {
      issues.push({ code: 'apprenticeship_on_senior_role', severity: 'high', message: 'Apprenticeship label on a senior/management role.' });
    }
    if (c.apprenticeship.value === 'unverified') {
      issues.push({ code: 'unverified_apprenticeship', severity: 'medium', message: 'Apprenticeship-like wording without a registered/trade signal.' });
    }
    if (c.fairChance.value && c.excludesFelons.value) {
      issues.push({ code: 'fairchance_exclusion_conflict', severity: 'high', message: 'Marked fair-chance but also excludes records.' });
    }
    if (c.industry.confidence === 'uncertain') {
      issues.push({ code: 'industry_uncertain', severity: 'low', message: 'Industry could not be classified with confidence.' });
    }
    if (!c.dataComplete) {
      issues.push({ code: 'incomplete_posting', severity: 'medium', message: 'Posting too sparse — labels are low-confidence.' });
    }
  }
  // Location sanity: a normalized region should be a 2-letter code, and the
  // city should not repeat the region.
  const region = (job.locationRegion ?? '').trim();
  const city = (job.locationCity ?? '').trim();
  if (region && !(region.length === 2 && STATE_ABBRS.has(region.toUpperCase())) && !US_STATES[region.toLowerCase()]) {
    issues.push({ code: 'location_region_unnormalized', severity: 'low', message: `Region "${region}" is not a normalized state.` });
  }
  if (city && region && city.toLowerCase().endsWith(`, ${region.toLowerCase()}`)) {
    issues.push({ code: 'location_duplicate', severity: 'low', message: `City "${city}" repeats the region.` });
  }
  return issues;
}

export function auditPool(jobs: AuditableJob[]): QaReport {
  const flagged: QaRecord[] = [];
  for (const j of jobs) {
    const issues = auditJob(j);
    if (issues.length) flagged.push({ id: j.id, title: j.title, company: j.company, issues });
  }
  return { total: jobs.length, flaggedCount: flagged.length, flagged };
}
