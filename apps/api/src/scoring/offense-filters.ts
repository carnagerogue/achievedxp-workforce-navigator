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

export const OFFENSE_FILTER_RULES: ReadonlyArray<OffenseFilterRule> = [
  {
    matchConviction: (c) => c.offenseType === OffenseType.REGISTRY_RELATED || c.registryStatus,
    matchOffenseType: (t) => t === OffenseType.REGISTRY_RELATED,
    blocksIndustry: new Set(['education', 'healthcare', 'childcare', 'schools']),
    blocksTitleKeyword: ['school', 'daycare', 'childcare', 'minor', 'pediatric', 'caregiver', 'youth'],
    reason:
      'Registry-related conviction status may legally bar roles involving minors, schools, or vulnerable-population settings. Caseworker review recommended.',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.FINANCIAL_FRAUD,
    matchOffenseType: (t) => t === OffenseType.FINANCIAL_FRAUD,
    blocksIndustry: new Set(['finance']),
    blocksTitleKeyword: ['teller', 'accountant', 'bookkeeper', 'cashier', 'cash handling', 'payroll'],
    reason: 'A financial-fraud conviction typically disqualifies cash-handling and finance roles.',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.WEAPONS,
    matchOffenseType: (t) => t === OffenseType.WEAPONS,
    blocksIndustry: new Set(['security']),
    blocksTitleKeyword: ['armed', 'firearm', 'security guard'],
    reason: 'A weapons-related conviction bars security roles requiring firearms eligibility.',
  },
  {
    matchConviction: (c) => c.offenseType === OffenseType.DUI,
    matchOffenseType: (t) => t === OffenseType.DUI,
    blocksIndustry: new Set<string>(),
    blocksTitleKeyword: ['driver', 'cdl', 'delivery', 'chauffeur'],
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
