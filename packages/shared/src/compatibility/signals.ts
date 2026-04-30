/**
 * Signal detection — phrase + concept scanning of job text for hard
 * barriers (clean-record requirements, clearance, restricted-population
 * roles) and positive fair-chance posture.
 *
 * Pure-function detectors. Each returns a list of `Signal` records that
 * the scoring engine consumes deterministically. No regex globbing
 * surprises; every pattern is bounded by word boundaries or anchored
 * phrases to avoid false positives like "navy blue" matching "Navy".
 */

export type SignalSeverity = 'critical' | 'high' | 'medium' | 'low' | 'positive' | 'positive_minor';

export interface Signal {
  id: string;
  severity: SignalSeverity;
  message: string;
  matchedText?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Hard-barrier phrase patterns — clean-record / clearance / fingerprint
// ─────────────────────────────────────────────────────────────────────

interface PatternRule {
  id: string;
  /** Pattern matched against lowercased title + description + company. */
  pattern: RegExp;
  severity: SignalSeverity;
  message: string;
}

/**
 * Critical hard-barrier phrases — these are near-certain disqualifiers
 * regardless of conviction type, so the scorer drops the score sharply.
 */
const HARD_BARRIER_PATTERNS: PatternRule[] = [
  { id: 'clean_background_required', pattern: /\bclean\s+(criminal\s+)?(background|record|history)\b/, severity: 'critical', message: 'Posting requires a clean background.' },
  { id: 'no_felony_convictions',     pattern: /\b(no|cannot have|must not have)\s+felony( convictions?)?\b/, severity: 'critical', message: 'Posting states no felony convictions allowed.' },
  { id: 'no_criminal_record',        pattern: /\bno\s+criminal\s+(record|history)\b/, severity: 'critical', message: 'Posting states no criminal record allowed.' },
  { id: 'must_pass_federal_bgcheck', pattern: /\bmust pass (a |an )?federal background\b/, severity: 'critical', message: 'Federal background check required.' },
  { id: 'security_clearance',        pattern: /\b(active )?security clearance\b/, severity: 'critical', message: 'Active security clearance required.' },
  { id: 'top_secret_clearance',      pattern: /\btop[\s-]secret( clearance| ts\/sci)?\b/, severity: 'critical', message: 'Top Secret clearance required.' },
  { id: 'public_trust_clearance',    pattern: /\bpublic trust( clearance)?\b/, severity: 'high',     message: 'Public Trust clearance required.' },
  { id: 'cjis',                      pattern: /\bcjis\b/, severity: 'critical', message: 'CJIS-compliant background required (criminal-justice information systems).' },
  { id: 'livescan',                  pattern: /\blivescan\b/, severity: 'high',     message: 'LiveScan fingerprinting required.' },
  { id: 'fingerprinting_required',   pattern: /\bfingerprint(ing|s)?\s+(required|will be|are required)\b/, severity: 'high',     message: 'Fingerprinting required.' },
  { id: 'background_investigation',  pattern: /\bbackground investigation\b/, severity: 'high',     message: 'Background investigation required.' },
  { id: 'must_be_bondable',          pattern: /\bmust be bondable\b|\beligible for bonding\b/, severity: 'high',     message: 'Position requires the candidate to be bondable.' },
  { id: 'twic',                      pattern: /\btwic\b/, severity: 'high',     message: 'TWIC card required (Transportation Worker Identification Credential).' },
  { id: 'finra',                     pattern: /\bfinra\b/, severity: 'high',     message: 'FINRA registration required (financial industry).' },
  { id: 'airport_security',          pattern: /\bairport security clearance\b|\bsida\b/, severity: 'high',     message: 'Airport security clearance / SIDA badge required.' },
  { id: 'hspd12_piv',                pattern: /\b(hspd[\s-]12|piv card|piv\s?credential)\b/, severity: 'high',     message: 'HSPD-12 PIV credential required (federal facility).' },
  { id: 'fiduciary_responsibility',  pattern: /\bfiduciary (duty|responsibilit(y|ies))\b/, severity: 'high',     message: 'Position carries fiduciary responsibility.' },
  // Concept signals — duty / environment markers
  { id: 'access_financial_records',  pattern: /\baccess to financial records\b|\baccess to confidential financial\b/, severity: 'high',     message: 'Job involves access to financial records.' },
  { id: 'cash_handling',             pattern: /\bcash[\s-]handling\b|\bhandle(s)? cash\b/, severity: 'medium',   message: 'Job involves cash handling.' },
  { id: 'controlled_substances',     pattern: /\bcontrolled substances?\b|\bschedule (i|ii|iii|iv|v) substances?\b/, severity: 'high',     message: 'Job involves controlled substances.' },
  { id: 'medication_handling',       pattern: /\bmedication (handling|administration|management)\b|\bdispens(e|ing) medication\b/, severity: 'high',     message: 'Job involves medication handling.' },
  { id: 'pharmacy_role',             pattern: /\bpharmac(y|ist|ies|euticals?)\b/, severity: 'high',     message: 'Pharmacy environment.' },
  { id: 'driving_required',          pattern: /\bdriving (is )?(required|essential)\b|\bmust be able to drive\b/, severity: 'medium',   message: 'Job requires driving.' },
  { id: 'valid_dl_required',         pattern: /\bvalid (driver'?s?\s+)?license( required)?\b/, severity: 'low',      message: 'Valid driver\u2019s license required.' },
  { id: 'clean_driving_record',      pattern: /\bclean driving record\b|\bclear (mvr|driving history)\b/, severity: 'high',     message: 'Clean driving record required.' },
  { id: 'cdl_required',              pattern: /\bcdl(\s+(required|class\s+[abc]))?\b/, severity: 'medium',   message: 'CDL (Commercial Driver\u2019s License) required.' },
  { id: 'home_visits',               pattern: /\bhome visits?\b|\bin[\s-]home (services|care|support)\b|\bresidential access\b/, severity: 'high',     message: 'Job involves entering private residences.' },
  // "Children / minors / students" — too generic on its own ("minor injuries",
  // "may receive student loan", "youth-friendly community"). Require the term
  // be paired with workplace verbs like "work with" / "around" / "supervise"
  // so we only fire when the role actually involves access to those people.
  { id: 'children_or_minors',        pattern: /\b(work(s|ing)?\s+with|around|supervise|care\s+for|tutor|teach)\s+(minors?|child(ren)?|youth|students?)\b|\b(unsupervised\s+(access\s+to\s+)?(minors?|child(ren)?|youth|students?))\b/, severity: 'high', message: 'Job involves working with minors / children / students.' },
  // School / childcare setting — must be a workplace marker, NOT an
  // education-credential phrase. Vetoes "high school diploma / equivalent /
  // graduate / GED" by requiring an actual workplace word nearby and
  // explicitly excluding diploma-context "high school".
  { id: 'school_setting',            pattern: /\b(?:elementary|middle)\s+school\b|\bk-12\b|\bkindergarten\b|\bdaycare\b|\bchild(?:\s|-)?care\b|\bschool\s+(district|setting|environment|campus|grounds|facility|building|board)\b|\bpre[\s-]?school\b/, severity: 'critical', message: 'School / childcare setting.' },
  { id: 'elder_or_residential',     pattern: /\belder care\b|\bnursing home\b|\bassisted living\b|\bresidential care\b|\blong[\s-]term care\b/, severity: 'high',     message: 'Elder care / residential care setting.' },
  { id: 'healthcare_facility',       pattern: /\b(hospital|healthcare facility|medical center|patient[\s-]facing|clinical setting)\b/, severity: 'medium',   message: 'Healthcare facility setting.' },
  { id: 'security_role',             pattern: /\b(unarmed )?security (officer|guard)\b|\barmed security\b/, severity: 'high',     message: 'Security role.' },
  { id: 'corrections_role',          pattern: /\bcorrection(s|al)( officer)?\b|\bdetention\b/, severity: 'critical', message: 'Corrections / detention role.' },
  { id: 'law_enforcement_role',      pattern: /\b(police officer|sheriff|deputy|federal agent|special agent)\b/, severity: 'critical', message: 'Law enforcement role.' },
  { id: 'defense_contractor',        pattern: /\bdefense contractor\b|\bdod contractor\b|\bcleared (facility|environment)\b/, severity: 'high',     message: 'Defense / DoD contractor environment.' },
  { id: 'vulnerable_populations',    pattern: /\bvulnerable (populations?|adults?)\b|\bat[\s-]risk (youth|adults?)\b/, severity: 'high',     message: 'Vulnerable-population setting.' },
];

// ─────────────────────────────────────────────────────────────────────
// Fair-chance / second-chance positive phrasing
// ─────────────────────────────────────────────────────────────────────

const FAIR_CHANCE_PATTERNS: PatternRule[] = [
  { id: 'fair_chance_employer',       pattern: /\bfair[\s-]chance employer\b/, severity: 'positive', message: 'Identifies as a fair-chance employer.' },
  { id: 'fair_chance_language',       pattern: /\bfair[\s-]chance\b/, severity: 'positive', message: 'Posting includes fair-chance language.' },
  { id: 'second_chance_language',     pattern: /\bsecond[\s-]chance\b/, severity: 'positive', message: 'Posting includes second-chance language.' },
  { id: 'criminal_histories_consid',  pattern: /\b(qualified )?applicants? with (criminal|arrest) (histor|record)\w*\b|\bcriminal histor(y|ies) (will be|are) considered\b/, severity: 'positive', message: 'Posting states applicants with criminal histories will be considered.' },
  { id: 'individualized_assessment',  pattern: /\bindividualized assessment\b/, severity: 'positive', message: 'Employer commits to an individualized assessment.' },
  { id: 'ban_the_box',                pattern: /\bban[\s-]the[\s-]box\b/, severity: 'positive', message: 'Employer follows Ban-the-Box policy.' },
  { id: 'fair_chance_act',            pattern: /\bfair[\s-]chance act\b/, severity: 'positive', message: 'Employer references Fair Chance Act compliance.' },
  { id: 'federal_bonding',            pattern: /\b(federal )?bonding program\b|\bparticipates in (the )?federal bonding\b/, severity: 'positive', message: 'Participates in the federal bonding program.' },
  { id: 'reentry_partner',            pattern: /\b(workforce )?reentry (partner|program)\b|\bjustice[\s-]involved\b|\bformerly incarcerated\b/, severity: 'positive', message: 'Employer is a reentry / justice-involved hiring partner.' },
  { id: 'background_friendly',        pattern: /\bbackground[\s-]friendly\b/, severity: 'positive', message: 'Posting states background-friendly hiring.' },
  // Generic EOE — small positive only; do not let this override hard barriers.
  { id: 'equal_opportunity',          pattern: /\bequal opportunity employer\b|\beoe\b/, severity: 'positive_minor', message: 'Generic equal-opportunity employer language.' },
];

// ─────────────────────────────────────────────────────────────────────
// Public detectors
// ─────────────────────────────────────────────────────────────────────

/**
 * Build the consolidated lowercased corpus the scanners read against.
 * Includes title + company + description so single-field misses are rare.
 */
function corpusOf(input: { title?: string | null; company?: string | null; description?: string | null }): string {
  return [input.title ?? '', input.company ?? '', input.description ?? '']
    .join('\n')
    .toLowerCase();
}

function findMatches(corpus: string, rules: PatternRule[]): Signal[] {
  const out: Signal[] = [];
  for (const rule of rules) {
    const m = corpus.match(rule.pattern);
    if (m) {
      out.push({
        id: rule.id,
        severity: rule.severity,
        message: rule.message,
        matchedText: m[0]?.slice(0, 80),
      });
    }
  }
  return out;
}

export interface SignalsResult {
  hardBarriers: Signal[];
  fairChance: Signal[];
  /** Convenience flag: any critical hard barrier present. */
  hasCriticalBarrier: boolean;
  /** Convenience flag: any fair-chance language at all (excluding generic EOE). */
  hasFairChance: boolean;
}

/**
 * Scan a job's text and return the consolidated signal set. This is the
 * entry point used by `scoring.ts` and is also exposed so caller code
 * (e.g. the explanation generator) can show matched text in the UI.
 */
export function detectSignals(input: { title?: string | null; company?: string | null; description?: string | null }): SignalsResult {
  const corpus = corpusOf(input);
  const hardBarriers = findMatches(corpus, HARD_BARRIER_PATTERNS);
  const fairChance = findMatches(corpus, FAIR_CHANCE_PATTERNS);
  return {
    hardBarriers,
    fairChance,
    hasCriticalBarrier: hardBarriers.some((s) => s.severity === 'critical'),
    hasFairChance: fairChance.some((s) => s.severity === 'positive'),
  };
}

/**
 * Employer fair-chance posture — a coarser classification used by the
 * scorer to weight the `employerFairChancePosture` component.
 */
export type EmployerPosture = 'positive' | 'neutral' | 'unknown' | 'strict' | 'very_strict';

export function classifyEmployerPosture(signals: SignalsResult, jobInput: {
  excludesFelons?: boolean | null;
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  description?: string | null;
}): EmployerPosture {
  const criticalCount = signals.hardBarriers.filter((s) => s.severity === 'critical').length;
  const highBarrierCount = signals.hardBarriers.filter((s) => s.severity === 'high').length;
  const positiveCount = signals.fairChance.filter((s) => s.severity === 'positive').length;

  if (criticalCount >= 1 || jobInput.excludesFelons === true) return 'very_strict';
  if (highBarrierCount >= 2) return 'strict';
  if (positiveCount >= 1) return 'positive';
  // Generic EOE alone or a single high-barrier signal → neutral.
  if (signals.fairChance.some((s) => s.severity === 'positive_minor')) return 'neutral';
  if (highBarrierCount === 1) return 'neutral';
  if ((jobInput.description?.length ?? 0) < 200) return 'unknown';
  return 'neutral';
}
