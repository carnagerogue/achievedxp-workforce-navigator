/**
 * Lightweight classifier ported from apps/api/src/classification.
 *
 * Detects industry, risk tier, fair-chance friendliness, apprenticeship
 * status, and background-check likelihood from a job's title + description
 * + employer name. Same rules as the original NestJS classifier, just
 * trimmed for the in-app provider layer.
 *
 * Pure function, no external deps — safe to import from server route
 * handlers running in the Node runtime.
 */

import type { JobDto, RiskTier } from '@dxp/shared';

export interface ClassifyInput {
  title: string;
  description: string;
  company: string;
  industryHint?: string | null;
}

export interface ClassifyOutput {
  industry: string | null;
  riskTier: RiskTier;
  backgroundCheckLikely: boolean;
  excludesFelons: boolean;
  isApprenticeship: boolean;
  remote: boolean;
}

// Industry keyword rules. First match wins. Ordered by specificity.
const INDUSTRY_RULES: ReadonlyArray<[string, readonly string[]]> = [
  ['healthcare',       ['nurse', 'cna', 'rn', 'lpn', 'medical', 'hospital', 'clinic', 'phlebotom', 'pharmacy', 'patient', 'caregiver']],
  ['government',       ['federal', 'gsa', 'va medical', 'state of ', 'county of ', 'civil service']],
  ['transportation',   ['cdl', 'driver', 'trucking', 'freight', 'delivery', 'logistics', 'shipping']],
  ['warehousing',      ['warehouse', 'forklift', 'distribution center', 'picking', 'packing', 'pallet']],
  ['construction',     ['carpenter', 'electrician', 'plumber', 'concrete', 'mason', 'framer', 'roofing', 'hvac', 'apprentice', 'journeyman']],
  ['manufacturing',    ['welder', 'machinist', 'fabricat', 'assembly', 'production line', 'foundry', 'cnc']],
  ['food_service',     ['cook', 'chef', 'kitchen', 'restaurant', 'barista', 'server', 'dishwasher', 'food prep']],
  ['automotive',       ['mechanic', 'auto repair', 'tire tech', 'oil change', 'collision repair']],
  ['cleaning',         ['janitor', 'custodian', 'cleaner', 'housekeep', 'sanitation']],
  ['landscaping',      ['landscap', 'groundskeep', 'lawn care', 'tree trimm']],
  ['retail',           ['retail', 'cashier', 'sales associate', 'merchandis', 'stocker']],
  ['it_general',       ['developer', 'engineer', 'sysadmin', 'help desk', 'it support', 'network tech']],
  ['energy_utilities', ['utility', 'lineman', 'oilfield', 'driller', 'powerline', 'wind tech', 'solar install']],
  ['services',         ['maintenance', 'janitorial', 'security guard', 'customer service']],
  ['logistics',        ['shipping', 'receiving', 'inventory', 'dispatch']],
  ['education',        ['teacher', 'instructor', 'school', 'tutor', 'professor']],
];

// Industries the federal/state apparatus pretty consistently runs a
// rigorous background check on. These default to riskTier=HIGH with
// excludesFelons=true when no contrary signal is present.
const HIGH_RISK_INDUSTRIES = new Set([
  'healthcare', 'government', 'education',
]);

// Industries with established fair-chance hiring patterns.
const LOW_RISK_INDUSTRIES = new Set([
  'warehousing', 'construction', 'manufacturing', 'food_service',
  'landscaping', 'cleaning', 'automotive', 'energy_utilities',
]);

const FEDERAL_EMPLOYER_PATTERNS: RegExp[] = [
  /\b(department of |dept\. of |dod|department of defense)\b/i,
  /\bu\.?s\.? (army|navy|air force|marine corps|coast guard|space force)\b/i,
  /\b(fbi|cia|nsa|dea|atf|tsa|cbp|ice|usss|us marshals|federal bureau)\b/i,
  /\bgsa\b/i,
  /\b(joint base|fort \w+|naval (station|base)|afb|nas|mcas|pearl harbor)\b/i,
];

const APPRENTICESHIP_PATTERNS: RegExp[] = [
  /\bapprentice(ship)?\b/i,
  /\bjourney(man|level)\b/i,
  /\b(ibew|ua local|carpenters? union)\b/i,
  /\b(earn while you learn|registered apprenticeship)\b/i,
];

const CLEAN_RECORD_PATTERNS: RegExp[] = [
  /\b(clean (background|record) required)\b/i,
  /\b(no (criminal|felony) record)\b/i,
  /\b(must pass (a )?background check)\b/i,
  /\b(security clearance required|secret clearance)\b/i,
  /\bcjis\b/i,
];

const FAIR_CHANCE_PATTERNS: RegExp[] = [
  /\b(fair[- ]chance|second[- ]chance) (employer|hiring)\b/i,
  /\b(open to|considers?|welcomes?) (candidates|applicants) (with )?(past )?records?\b/i,
  /\bjustice[- ]impacted\b/i,
  /\b(felon[- ]friendly|reentry)\b/i,
  /\bnon[- ]violent (felon|record)/i,
];

const BACKGROUND_CHECK_PATTERNS: RegExp[] = [
  /\bbackground (check|investigation)\b/i,
  /\bcriminal history (review|check)\b/i,
  /\bdrug (test|screen)/i,
];

const REMOTE_PATTERNS: RegExp[] = [
  /\b(remote|work from home|wfh|fully remote|virtual position)\b/i,
];

const SECURITY_SCRUTINY_TITLES: RegExp[] = [
  /\b(police|sheriff|deputy|correctional officer|federal agent|prison guard)\b/i,
  /\b(security clearance|secret cleared|ts\/sci)\b/i,
  /\b(armed (guard|security))\b/i,
  /\b(bank teller|cash handler|treasury)\b/i,
];

export function classify(input: ClassifyInput): ClassifyOutput {
  const blob = `${input.title} ${input.description} ${input.company}`.toLowerCase();
  const employerBlob = input.company;

  // ── Industry ──
  let industry: string | null = input.industryHint?.trim() || null;
  if (!industry) {
    for (const [name, kws] of INDUSTRY_RULES) {
      if (kws.some((kw) => blob.includes(kw))) {
        industry = name;
        break;
      }
    }
  }

  // ── Apprenticeship ──
  const isApprenticeship = APPRENTICESHIP_PATTERNS.some((re) => re.test(blob));

  // ── Remote ──
  const remote = REMOTE_PATTERNS.some((re) => re.test(blob));

  // ── Federal / cleared employer override ──
  const isFederalEmployer = FEDERAL_EMPLOYER_PATTERNS.some((re) => re.test(employerBlob));
  const isSecurityRole    = SECURITY_SCRUTINY_TITLES.some((re) => re.test(input.title));

  // ── Hard-barrier signals ──
  const hasCleanRecord = CLEAN_RECORD_PATTERNS.some((re) => re.test(blob));
  const hasFairChance  = FAIR_CHANCE_PATTERNS.some((re) => re.test(blob));
  const mentionsBgCheck = BACKGROUND_CHECK_PATTERNS.some((re) => re.test(blob));

  // ── Compose ──
  let riskTier: RiskTier;
  let excludesFelons: boolean;
  let backgroundCheckLikely: boolean;

  if (isFederalEmployer || isSecurityRole || hasCleanRecord) {
    riskTier = 'HIGH';
    excludesFelons = true;
    backgroundCheckLikely = true;
  } else if (industry && HIGH_RISK_INDUSTRIES.has(industry)) {
    riskTier = 'HIGH';
    excludesFelons = !hasFairChance;
    backgroundCheckLikely = true;
  } else if (mentionsBgCheck && !hasFairChance) {
    riskTier = 'MEDIUM';
    excludesFelons = false;
    backgroundCheckLikely = true;
  } else if (industry && LOW_RISK_INDUSTRIES.has(industry)) {
    riskTier = 'LOW';
    excludesFelons = false;
    backgroundCheckLikely = false;
  } else {
    riskTier = 'MEDIUM';
    excludesFelons = false;
    backgroundCheckLikely = mentionsBgCheck;
  }

  return {
    industry,
    riskTier,
    excludesFelons,
    backgroundCheckLikely,
    isApprenticeship,
    remote,
  };
}

/**
 * Apply classify() output to a partially-built JobDto. Convenience helper
 * so providers can write `applyClassification({ ...job })` and not worry
 * about field-by-field merging.
 */
export function applyClassification(
  job: Omit<JobDto, 'industry' | 'riskTier' | 'excludesFelons' | 'backgroundCheckLikely' | 'isApprenticeship' | 'remote'> & {
    industry?: string | null;
    remote?: boolean;
  },
): JobDto {
  const c = classify({
    title: job.title,
    description: job.description,
    company: job.company,
    industryHint: job.industry ?? null,
  });
  return {
    ...job,
    industry: c.industry,
    riskTier: c.riskTier,
    excludesFelons: c.excludesFelons,
    backgroundCheckLikely: c.backgroundCheckLikely,
    isApprenticeship: c.isApprenticeship,
    remote: job.remote || c.remote,
  };
}
