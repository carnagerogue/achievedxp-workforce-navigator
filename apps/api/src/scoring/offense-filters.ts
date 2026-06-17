import { Conviction, OffenseType, Prisma } from '@prisma/client';

/**
 * Offense-type × industry/role bar rules.
 *
 * Shared between:
 *   - RuleScorer.computeHardFilters — per-user match scoring (needs full
 *     Conviction objects to read registryStatus, currentlyIncarcerated etc.)
 *   - JobsService.list — browse-by-offense filter (needs to build a Prisma
 *     WHERE clause from a single OffenseType).
 *
 * Keeping the rules as data (not hardcoded branches) makes the policy
 * auditable and lets both consumers stay in sync automatically.
 */
export interface OffenseFilterRule {
  /** Does this rule apply to the given conviction? */
  matchConviction: (c: Conviction) => boolean;
  /** Does this rule apply to the given bare offense type? (used by /jobs) */
  matchOffenseType: (t: OffenseType) => boolean;
  /** Industries where this conviction is an automatic bar. */
  blocksIndustry: ReadonlySet<string>;
  /**
   * Substrings in job title that also trip the filter (case-insensitive).
   * Used for roles whose industry we don't classify (e.g., a "teller" job
   * tagged as "services" should still be filtered for fraud convictions).
   */
  blocksTitleKeyword: ReadonlyArray<string>;
  /** Human-readable reason — used in the Avoid card. */
  reason: string;
}

/**
 * NOTE: these rules mirror the dignity-centered single source of truth at
 * `packages/shared/src/compatibility/offense-hard-filters.ts`
 * (`OFFENSE_HARD_FILTERS`). They are duplicated here as Prisma-aware
 * `OffenseFilterRule`s (with `matchConviction` / `matchOffenseType`
 * predicates) rather than imported, to avoid pulling the shared TS source
 * into the Nest build graph. Keep the two in sync — the shared package's
 * test suite and `offense-hard-filters.test.ts` lock the expected behavior.
 *
 * Previously only 4 of the 10 conviction types were covered, so the other 6
 * (drug possession/distribution, violence, theft, burglary) had NO hard
 * filter on the API side even though the compatibility engine modeled them.
 */
export const OFFENSE_FILTER_RULES: ReadonlyArray<OffenseFilterRule> = [
  {
    matchConviction: (c) => c.offenseType === OffenseType.REGISTRY_RELATED || c.registryStatus,
    matchOffenseType: (t) => t === OffenseType.REGISTRY_RELATED,
    blocksIndustry: new Set(['education', 'healthcare', 'childcare', 'schools']),
    blocksTitleKeyword: [
      'school', 'daycare', 'childcare', 'minor', 'pediatric', 'caregiver',
      'youth', 'teacher', 'tutor', 'paraeducator', 'nanny', 'coach', 'camp',
      'home health', 'in-home', 'elder',
    ],
    reason:
      'Registry-related conviction status may legally bar roles involving minors, schools, or vulnerable-population settings. Caseworker review recommended.',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.VIOLENT,
    matchOffenseType: (t) => t === OffenseType.VIOLENT,
    blocksIndustry: new Set(['childcare', 'schools']),
    blocksTitleKeyword: [
      'childcare', 'daycare', 'school', 'minor', 'pediatric', 'youth',
      'caregiver', 'home health', 'patient care', 'security guard', 'armed',
    ],
    reason:
      'A violence-related conviction can bar roles with unsupervised access to children or vulnerable adults, and most armed-security positions. Individualized assessment recommended.',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.DRUG_DISTRIBUTION,
    matchOffenseType: (t) => t === OffenseType.DRUG_DISTRIBUTION,
    blocksIndustry: new Set<string>(),
    blocksTitleKeyword: [
      'pharmacy', 'pharmacist', 'pharmacy tech', 'medication', 'controlled substance',
      'dispensary', 'cannabis',
    ],
    reason:
      'A drug-distribution conviction commonly bars roles handling controlled substances or medication (pharmacy, dispensing).',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.DRUG_POSSESSION,
    matchOffenseType: (t) => t === OffenseType.DRUG_POSSESSION,
    blocksIndustry: new Set<string>(),
    blocksTitleKeyword: ['pharmacy', 'pharmacist', 'pharmacy tech', 'controlled substance'],
    reason:
      'A drug-possession conviction may restrict roles directly handling controlled substances.',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.FINANCIAL_FRAUD,
    matchOffenseType: (t) => t === OffenseType.FINANCIAL_FRAUD,
    blocksIndustry: new Set(['finance', 'insurance']),
    blocksTitleKeyword: [
      'teller', 'accountant', 'bookkeeper', 'cashier', 'cash handling', 'payroll',
      'financial', 'controller', 'treasurer', 'auditor',
    ],
    reason: 'A financial-fraud conviction typically disqualifies cash-handling, finance, and fiduciary roles.',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.PROPERTY_THEFT,
    matchOffenseType: (t) => t === OffenseType.PROPERTY_THEFT,
    blocksIndustry: new Set<string>(),
    blocksTitleKeyword: ['cashier', 'teller', 'cash handling'],
    reason: 'A property/theft conviction can restrict cash-handling roles.',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.PROPERTY_BURGLARY,
    matchOffenseType: (t) => t === OffenseType.PROPERTY_BURGLARY,
    blocksIndustry: new Set<string>(),
    blocksTitleKeyword: ['in-home', 'in home', 'home services', 'locksmith', 'residential'],
    reason: 'A burglary conviction can bar roles with unsupervised access to private residences (in-home services, locksmithing).',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.WEAPONS,
    matchOffenseType: (t) => t === OffenseType.WEAPONS,
    blocksIndustry: new Set(['security']),
    blocksTitleKeyword: ['armed', 'firearm', 'security guard', 'armed guard'],
    reason: 'A weapons-related conviction bars security roles requiring firearms eligibility.',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.DUI,
    matchOffenseType: (t) => t === OffenseType.DUI,
    blocksIndustry: new Set<string>(),
    blocksTitleKeyword: ['driver', 'cdl', 'delivery', 'chauffeur', 'trucking', 'truck driver'],
    reason: 'A recent DUI conviction disqualifies most commercial driving roles (DOT regulation).',
  },
];

/**
 * Build a Prisma WHERE fragment that excludes every job blocked for the
 * given offense type. Combine with other filters using `AND`.
 *
 * Returns `undefined` when no rules match (no filter needed).
 */
export function buildOffenseExclusionWhere(
  offenseType: OffenseType,
): Prisma.JobWhereInput | undefined {
  const applicable = OFFENSE_FILTER_RULES.filter((r) => r.matchOffenseType(offenseType));
  if (applicable.length === 0) return undefined;

  const blockedIndustries = new Set<string>();
  const blockedKeywords: string[] = [];
  for (const rule of applicable) {
    for (const i of rule.blocksIndustry) blockedIndustries.add(i);
    blockedKeywords.push(...rule.blocksTitleKeyword);
  }

  const clauses: Prisma.JobWhereInput[] = [];
  if (blockedIndustries.size > 0) {
    clauses.push({ NOT: { industry: { in: [...blockedIndustries] } } });
  }
  for (const kw of blockedKeywords) {
    clauses.push({ NOT: { title: { contains: kw, mode: 'insensitive' } } });
  }
  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}
