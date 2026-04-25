/**
 * Conviction × duty risk matrix — the heart of the compatibility engine.
 *
 * For each conviction type we declare three concept buckets:
 *   - HIGH concern: duty / industry combinations that almost always make
 *                   this conviction a problem (e.g. drug-distribution +
 *                   pharmacy access).
 *   - MEDIUM concern: situations that may matter depending on employer
 *                     policy or specific role responsibilities.
 *   - LOW concern: roles where the conviction has minimal duty conflict.
 *
 * The matrix uses keyword fragments matched against {industry, title,
 * description} of the job. This is intentionally simple and auditable —
 * every match is explained in the audit trail. Extend the lists below
 * when new concerns are discovered; keep them lowercase.
 *
 * Bias: when in doubt, classify as MEDIUM rather than LOW. The cost of a
 * false-positive concern (we tell someone "review carefully") is low; the
 * cost of a false-negative ("this is fine!" when it isn't) is high.
 */
import type { ConvictionType } from './types';

export type ConcernLevel = 'high' | 'medium' | 'low';

export interface ConcernRule {
  level: ConcernLevel;
  /** Lowercase keyword fragment(s) checked against industry+title+description. */
  keywords: string[];
  /** Where the keyword must appear. 'any' = anywhere; otherwise restrict to that surface. */
  surface?: 'any' | 'industry' | 'title' | 'description';
  /** Caseworker-friendly explanation of why this rule fires. */
  reason: string;
  /** Stable id for the audit trail. */
  ruleId: string;
}

/** A bundle of concern rules per conviction type plus a default fallback. */
export interface ConvictionMatrix {
  /** Plain-language risk overview shown in the score breakdown. */
  description: string;
  rules: ConcernRule[];
  /** Returned when nothing in `rules` matches — typically 'low' for non-sensitive roles. */
  defaultLevel: ConcernLevel;
  /** Default reason when no rule matches. */
  defaultReason: string;
}

// ════════════════════════════════════════════════════════════════════
// PER-CONVICTION MATRICES
// ════════════════════════════════════════════════════════════════════

const drugPossession: ConvictionMatrix = {
  description: 'Higher concern when the role involves controlled substances, vulnerable populations, safety-sensitive duties, or government suitability review.',
  rules: [
    { level: 'high', ruleId: 'dp_pharmacy_or_meds',  keywords: ['pharmacy', 'pharmacist', 'pharmaceutical', 'controlled substance', 'medication handling', 'dispensary'], reason: 'Role involves pharmacy access or medication handling — drug-related convictions typically disqualify.', surface: 'any' },
    { level: 'high', ruleId: 'dp_school_or_minors',  keywords: ['school', 'teacher', 'k-12', 'kindergarten', 'childcare', 'daycare', 'youth program'], reason: 'School / childcare environments require fingerprint-based clearance; drug convictions are typically disqualifying.', surface: 'any' },
    { level: 'high', ruleId: 'dp_safety_sensitive_cdl', keywords: ['cdl', 'commercial driver', 'commercial vehicle', 'safety[- ]sensitive', 'dot regulated'], reason: 'CDL / safety-sensitive roles enforce DOT drug-and-alcohol rules.', surface: 'any' },
    { level: 'high', ruleId: 'dp_federal_clearance', keywords: ['federal background', 'security clearance', 'public trust', 'cjis', 'tsa', 'fbi', 'dea'], reason: 'Federal suitability / clearance roles weigh recent drug convictions heavily.', surface: 'any' },
    { level: 'medium', ruleId: 'dp_healthcare',     keywords: ['healthcare', 'hospital', 'patient[- ]facing', 'clinical', 'medical assistant'], reason: 'Healthcare settings vary by state; drug convictions can affect licensure.', surface: 'any' },
    { level: 'low',  ruleId: 'dp_low_risk',          keywords: ['warehouse', 'general labor', 'manufacturing', 'food service', 'cook', 'janitorial', 'cleaning', 'construction', 'remote'], reason: 'Roles with no controlled-substance access typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'No specific high-risk markers found, but a background check may still apply.',
};

const drugDistribution: ConvictionMatrix = {
  description: 'High concern in pharmacy, healthcare, schools, corrections, law enforcement, security, government contractors, and medication logistics. Medium concern for general logistics and delivery; low for general labor and construction.',
  rules: [
    { level: 'high', ruleId: 'dd_pharmacy_or_meds',  keywords: ['pharmacy', 'pharmacist', 'pharmaceutical', 'controlled substance', 'medication handling', 'dispensary'], reason: 'Drug-distribution convictions disqualify pharmacy / medication-handling roles.', surface: 'any' },
    { level: 'high', ruleId: 'dd_schools_corrections_le', keywords: ['school', 'teacher', 'k-12', 'kindergarten', 'childcare', 'corrections', 'detention', 'police', 'sheriff'], reason: 'Schools, corrections, and law enforcement disqualify drug-distribution convictions.', surface: 'any' },
    { level: 'high', ruleId: 'dd_government_contractor', keywords: ['security clearance', 'public trust', 'federal background', 'cjis', 'defense contractor'], reason: 'Government / cleared environments treat drug-distribution as serious suitability concern.', surface: 'any' },
    { level: 'medium', ruleId: 'dd_logistics_delivery', keywords: ['delivery', 'logistics', 'inventory', 'courier', 'fulfillment', 'freight'], reason: 'Logistics / delivery roles may flag drug-distribution convictions during background review.', surface: 'any' },
    { level: 'medium', ruleId: 'dd_transportation',   keywords: ['cdl', 'truck driver', 'transportation', 'rideshare'], reason: 'Transportation roles vary by carrier policy; some flag drug convictions.', surface: 'any' },
    { level: 'low',  ruleId: 'dd_low_risk',           keywords: ['general labor', 'construction', 'landscaping', 'sanitation', 'manufacturing', 'cook', 'janitorial', 'food service'], reason: 'General-labor / construction roles typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'No specific markers; background check may apply.',
};

const violentOffense: ConvictionMatrix = {
  description: 'High concern in any role with access to children, vulnerable adults, healthcare patients, residents of facilities, or in-home services. Medium concern for customer-facing roles. Low concern for warehouse, construction, manufacturing, sanitation, and supervised labor.',
  rules: [
    { level: 'high', ruleId: 'vo_children',            keywords: ['school', 'teacher', 'k-12', 'kindergarten', 'childcare', 'daycare', 'youth program', 'after[- ]school'], reason: 'Roles with access to minors require fingerprint-based clearance; violent convictions disqualify.', surface: 'any' },
    { level: 'high', ruleId: 'vo_vulnerable_adults',   keywords: ['elder care', 'nursing home', 'assisted living', 'residential care', 'long[- ]term care', 'vulnerable adult', 'in[- ]home'], reason: 'Roles serving vulnerable adults / residents typically disqualify violent convictions.', surface: 'any' },
    { level: 'high', ruleId: 'vo_healthcare_direct',   keywords: ['patient[- ]facing', 'home health', 'caregiver', 'cna', 'personal care aide', 'hospice'], reason: 'Direct patient care roles weigh violent convictions heavily.', surface: 'any' },
    { level: 'high', ruleId: 'vo_security_or_le',      keywords: ['security guard', 'security officer', 'corrections', 'detention', 'police', 'sheriff', 'armed', 'armored'], reason: 'Security / law enforcement / corrections roles disqualify violent convictions.', surface: 'any' },
    { level: 'medium', ruleId: 'vo_customer_facing',   keywords: ['customer service', 'retail', 'cashier', 'host', 'reception', 'front desk', 'concierge'], reason: 'Public-facing roles may consider violent convictions during background review.', surface: 'any' },
    { level: 'medium', ruleId: 'vo_field_service',     keywords: ['field service', 'in[- ]home services', 'door[- ]to[- ]door'], reason: 'Field roles entering customer homes are sensitive to violent convictions.', surface: 'any' },
    { level: 'low',  ruleId: 'vo_low_risk',            keywords: ['warehouse', 'construction', 'manufacturing', 'sanitation', 'cleaning', 'janitorial', 'cook', 'back[- ]of[- ]house', 'remote'], reason: 'Roles without public / vulnerable-population access typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'Background check may apply; review the duties for any vulnerable-population access.',
};

const registryRelated: ConvictionMatrix = {
  description: 'Very high concern in restricted environments such as schools, childcare, youth programs, elder care, vulnerable-population settings, hospitals, residential facilities, in-home services, public recreation, parks programs, and unsupervised access to private homes.',
  rules: [
    { level: 'high', ruleId: 'rr_restricted_minors',    keywords: ['school', 'teacher', 'k-12', 'kindergarten', 'childcare', 'daycare', 'youth program', 'after[- ]school', 'park', 'recreation', 'minor', 'student'], reason: 'Role may involve restricted environments with access to minors. Caseworker or legal review is recommended before applying.', surface: 'any' },
    { level: 'high', ruleId: 'rr_vulnerable_pop',       keywords: ['elder care', 'nursing home', 'assisted living', 'residential care', 'long[- ]term care', 'vulnerable adult', 'in[- ]home', 'home visit', 'residential access', 'group home'], reason: 'Role may involve vulnerable-population settings or residential access. Additional background review may apply.', surface: 'any' },
    { level: 'high', ruleId: 'rr_healthcare_direct',    keywords: ['patient[- ]facing', 'home health', 'caregiver', 'hospital', 'clinical', 'cna', 'hospice'], reason: 'Healthcare environments are typically restricted. Caseworker review recommended.', surface: 'any' },
    { level: 'high', ruleId: 'rr_public_facing_unsup',  keywords: ['transportation', 'rideshare', 'driver', 'delivery into home', 'door[- ]to[- ]door'], reason: 'Roles with unsupervised public / residential access may be restricted.', surface: 'any' },
    { level: 'medium', ruleId: 'rr_customer_facing',    keywords: ['customer service', 'retail', 'host', 'reception'], reason: 'Customer-facing environments may carry restrictions depending on the workplace.', surface: 'any' },
    { level: 'low',  ruleId: 'rr_low_risk',             keywords: ['warehouse', 'construction', 'manufacturing', 'sanitation', 'cleaning', 'janitorial', 'cook', 'back[- ]of[- ]house', 'remote', 'landscaping'], reason: 'Roles with no vulnerable-population or restricted-site access typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'Restrictions may apply depending on the workplace and applicable state law. Caseworker review recommended.',
};

const propertyTheft: ConvictionMatrix = {
  description: 'High concern when the role involves cash handling, inventory custody, package handling, residential access, or fiduciary responsibility.',
  rules: [
    { level: 'high', ruleId: 'pt_cash_or_finance',     keywords: ['cash[- ]handling', 'bank teller', 'cashier', 'fiduciary', 'banking', 'accounting', 'payroll', 'bookkeeping', 'finance', 'controller'], reason: 'Cash-handling / financial-record roles typically disqualify theft-related convictions.', surface: 'any' },
    { level: 'high', ruleId: 'pt_inventory_or_pkg',    keywords: ['inventory', 'package', 'fulfillment', 'warehouse associate', 'stock', 'merchandise'], reason: 'Inventory / package custody roles may flag theft convictions during background review.', surface: 'any' },
    { level: 'high', ruleId: 'pt_residential_access',  keywords: ['in[- ]home services', 'home visit', 'property management', 'residential access', 'high[- ]value equipment', 'jewelry'], reason: 'Roles with residential or high-value property access are sensitive to theft convictions.', surface: 'any' },
    { level: 'medium', ruleId: 'pt_retail_general',    keywords: ['retail', 'logistics', 'fulfillment', 'maintenance'], reason: 'General retail / logistics roles may apply additional background review.', surface: 'any' },
    { level: 'low',  ruleId: 'pt_low_risk',            keywords: ['construction', 'landscaping', 'manufacturing', 'sanitation', 'cleaning', 'cook', 'back[- ]of[- ]house', 'remote'], reason: 'Roles with no inventory / cash custody typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'Background check may apply; review the duties for cash or inventory custody.',
};

const burglary: ConvictionMatrix = {
  description: 'High concern when the role provides access to homes, residential property, hotels, or unsupervised facility access.',
  rules: [
    { level: 'high', ruleId: 'br_residential_access',   keywords: ['in[- ]home services', 'home visit', 'residential access', 'property management', 'apartment maintenance', 'janitorial in private', 'locksmith'], reason: 'Roles with residential access typically disqualify burglary convictions.', surface: 'any' },
    { level: 'high', ruleId: 'br_hotel_or_resi_clean',  keywords: ['hotel', 'hospitality', 'housekeeping', 'cleaner in private', 'guest room'], reason: 'Hotel / housekeeping roles entering private spaces are sensitive to burglary convictions.', surface: 'any' },
    { level: 'high', ruleId: 'br_delivery_into_home',   keywords: ['delivery into home', 'in[- ]home delivery', 'installation in home', 'cable installer', 'appliance installer'], reason: 'In-home delivery / installation roles weigh burglary convictions heavily.', surface: 'any' },
    { level: 'medium', ruleId: 'br_inventory_field',    keywords: ['warehouse', 'inventory', 'retail', 'field service'], reason: 'Inventory / field-service roles may apply additional background review.', surface: 'any' },
    { level: 'low',  ruleId: 'br_low_risk',             keywords: ['construction', 'manufacturing', 'sanitation', 'cleaning office', 'cook', 'back[- ]of[- ]house', 'remote'], reason: 'Roles without residential access typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'Background check may apply; review the duties for residential or unsupervised facility access.',
};

const financialFraud: ConvictionMatrix = {
  description: 'High concern in finance, banking, accounting, payroll, government benefits administration, procurement, and any role with access to confidential financial or personal information.',
  rules: [
    { level: 'high', ruleId: 'ff_finance_core',         keywords: ['banking', 'bank teller', 'accounting', 'bookkeeping', 'payroll', 'finance', 'controller', 'fiduciary', 'cpa', 'auditor', 'tax preparer'], reason: 'Finance / accounting roles disqualify financial-fraud convictions.', surface: 'any' },
    { level: 'high', ruleId: 'ff_insurance_procurement', keywords: ['insurance', 'claims adjuster', 'underwriter', 'procurement', 'purchasing', 'government benefits'], reason: 'Insurance / procurement / benefits roles weigh fraud convictions heavily.', surface: 'any' },
    { level: 'high', ruleId: 'ff_confidential_records', keywords: ['fiduciary', 'access to financial records', 'confidential personal information', 'pii', 'access to financial', 'access to confidential'], reason: 'Roles with access to confidential / financial records disqualify fraud convictions.', surface: 'any' },
    { level: 'medium', ruleId: 'ff_admin_sales',        keywords: ['office administration', 'sales', 'customer support', 'data entry'], reason: 'Office / sales roles may apply additional background review.', surface: 'any' },
    { level: 'low',  ruleId: 'ff_low_risk',             keywords: ['construction', 'manufacturing', 'food service', 'warehouse', 'sanitation', 'cleaning', 'landscaping', 'cook', 'back[- ]of[- ]house', 'remote labor'], reason: 'Manual / labor roles typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'Background check may apply; review the duties for financial or fiduciary responsibility.',
};

const weaponsRelated: ConvictionMatrix = {
  description: 'High concern in security, law enforcement, corrections, defense contractors, armored transport, and any role requiring weapons or firearms eligibility.',
  rules: [
    { level: 'high', ruleId: 'wp_security_le_corr',     keywords: ['security guard', 'security officer', 'armed', 'firearm', 'unarmed security', 'police', 'sheriff', 'corrections', 'detention'], reason: 'Security / law enforcement / corrections roles disqualify weapons convictions.', surface: 'any' },
    { level: 'high', ruleId: 'wp_armored_or_defense',   keywords: ['armored transport', 'armored car', 'defense contractor', 'cleared facility', 'military contractor'], reason: 'Armored / defense roles weigh weapons convictions heavily.', surface: 'any' },
    { level: 'medium', ruleId: 'wp_govt_contract',      keywords: ['government contractor', 'safety[- ]sensitive', 'field engineer'], reason: 'Government / safety-sensitive roles may apply weapons-conviction review.', surface: 'any' },
    { level: 'low',  ruleId: 'wp_low_risk',             keywords: ['food service', 'construction', 'manufacturing', 'warehouse', 'sanitation', 'cleaning', 'cook', 'back[- ]of[- ]house', 'remote'], reason: 'Roles without weapons or security duties typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'Background check may apply; review the duties for weapons / security responsibilities.',
};

const duiDwi: ConvictionMatrix = {
  description: 'High concern in CDL / commercial driving, school transportation, rideshare, heavy-equipment operation, and any role requiring a clean driving record. Low concern for non-driving roles.',
  rules: [
    { level: 'high', ruleId: 'dui_cdl_commercial',      keywords: ['cdl', 'commercial driver', 'truck driver', 'school bus', 'school transportation', 'rideshare', 'taxi'], reason: 'Commercial / school driving roles enforce DOT regulations and a clean driving record.', surface: 'any' },
    { level: 'high', ruleId: 'dui_clean_driving',       keywords: ['clean driving record', 'clear mvr', 'clear driving history'], reason: 'Posting requires a clean driving record.', surface: 'any' },
    { level: 'high', ruleId: 'dui_safety_heavy',        keywords: ['heavy equipment', 'forklift safety[- ]sensitive', 'crane operator', 'class[- ]a equipment'], reason: 'Safety-sensitive equipment operation typically enforces DOT-style standards.', surface: 'any' },
    { level: 'medium', ruleId: 'dui_field_or_delivery', keywords: ['delivery', 'field service', 'route driver', 'last[- ]mile', 'occasional driving'], reason: 'Delivery / field roles vary by carrier policy on DUI history.', surface: 'any' },
    { level: 'low',  ruleId: 'dui_no_driving',          keywords: ['warehouse', 'construction', 'manufacturing', 'sanitation', 'cleaning', 'cook', 'food service', 'back[- ]of[- ]house', 'remote', 'office'], reason: 'Non-driving roles typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'low',
  defaultReason: 'No driving requirements detected; concern is typically low.',
};

const otherConviction: ConvictionMatrix = {
  description: 'Other / unspecified conviction. Concern depends on industry sensitivity and detected duty markers (vulnerable populations, money, controlled substances, weapons, homes, secure facilities, driving).',
  rules: [
    { level: 'high', ruleId: 'oc_clearance_or_clean',   keywords: ['clean background', 'no felony', 'security clearance', 'fingerprint'], reason: 'Posting requires clean record / clearance regardless of conviction type.', surface: 'any' },
    { level: 'high', ruleId: 'oc_vulnerable_pop',       keywords: ['school', 'childcare', 'k-12', 'elder care', 'nursing home', 'home health', 'patient[- ]facing'], reason: 'Vulnerable-population settings apply additional background review.', surface: 'any' },
    { level: 'medium', ruleId: 'oc_finance_or_inventory', keywords: ['finance', 'banking', 'cash[- ]handling', 'inventory', 'fiduciary'], reason: 'Roles with money / inventory / fiduciary responsibility may apply background review.', surface: 'any' },
    { level: 'low',  ruleId: 'oc_low_risk',             keywords: ['warehouse', 'construction', 'manufacturing', 'sanitation', 'cleaning', 'cook', 'food service', 'remote', 'landscaping'], reason: 'Roles without sensitive duties typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'Generic background-check possibility; review the duties for sensitive markers.',
};

// ════════════════════════════════════════════════════════════════════
// Master map
// ════════════════════════════════════════════════════════════════════

export const CONVICTION_MATRIX: Record<ConvictionType, ConvictionMatrix> = {
  drug_possession: drugPossession,
  drug_distribution: drugDistribution,
  violent_offense: violentOffense,
  registry_related: registryRelated,
  property_theft: propertyTheft,
  burglary,
  financial_fraud: financialFraud,
  weapons_related: weaponsRelated,
  dui_dwi: duiDwi,
  other: otherConviction,
};

// ════════════════════════════════════════════════════════════════════
// EVALUATOR
// ════════════════════════════════════════════════════════════════════

export interface MatrixMatch {
  level: ConcernLevel;
  ruleId: string;
  reason: string;
  matchedKeyword: string;
}

/**
 * Normalize a string so substring matching ignores hyphen-vs-space
 * variation (e.g. "in-home" vs "in home") and case. Whitespace is
 * collapsed but boundaries are preserved.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')      // hyphens / underscores → space
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim();
}

/**
 * Expand a matrix keyword into one or more searchable forms. The matrix
 * authoring syntax allows a `[- ]` shorthand to mean "either a hyphen or
 * a space here" (e.g. `cash[- ]handling` matches both spellings).
 */
function expandKeyword(kw: string): string[] {
  if (!kw.includes('[- ]')) return [normalize(kw)];
  const variants = new Set<string>();
  variants.add(normalize(kw.replace(/\[- \]/g, ' ')));
  variants.add(normalize(kw.replace(/\[- \]/g, '-')));
  return Array.from(variants);
}

/**
 * Evaluate a single (conviction, job text) pair against the matrix.
 * Returns the worst-case match plus the full list of triggered rules.
 *
 * The "worst-case" precedence is: high > medium > low. If multiple high
 * rules match, the first one in the matrix wins (rules are ordered most
 * specific → least specific).
 */
export function evaluateMatrix(
  conviction: ConvictionType,
  jobInput: { industry?: string | null; title?: string | null; description?: string | null },
): { worst: MatrixMatch; all: MatrixMatch[]; matrixDescription: string } {
  const matrix = CONVICTION_MATRIX[conviction];
  const corpus: Record<'industry' | 'title' | 'description', string> = {
    industry: normalize(jobInput.industry ?? ''),
    title: normalize(jobInput.title ?? ''),
    description: normalize(jobInput.description ?? ''),
  };
  const corpusAll = `${corpus.industry}\n${corpus.title}\n${corpus.description}`;

  const all: MatrixMatch[] = [];

  for (const rule of matrix.rules) {
    const surface = rule.surface ?? 'any';
    const haystack = surface === 'any' ? corpusAll : corpus[surface];
    let hit: string | null = null;
    for (const kw of rule.keywords) {
      for (const variant of expandKeyword(kw)) {
        if (variant && haystack.includes(variant)) {
          hit = kw;
          break;
        }
      }
      if (hit) break;
    }
    if (hit) {
      all.push({ level: rule.level, ruleId: rule.ruleId, reason: rule.reason, matchedKeyword: hit });
    }
  }

  const order: ConcernLevel[] = ['high', 'medium', 'low'];
  let worst: MatrixMatch | null = null;
  for (const level of order) {
    const m = all.find((x) => x.level === level);
    if (m) { worst = m; break; }
  }

  if (!worst) {
    worst = {
      level: matrix.defaultLevel,
      ruleId: `${conviction}_default`,
      reason: matrix.defaultReason,
      matchedKeyword: '',
    };
  }
  return { worst, all, matrixDescription: matrix.description };
}

/** Translate a matrix concern level into a 0..1 "compatibility" score. */
export function concernLevelToContribution(level: ConcernLevel): number {
  switch (level) {
    case 'low': return 1.0;
    case 'medium': return 0.55;
    case 'high': return 0.15;
  }
}
