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
  /** Lowercase keyword fragment(s) checked against the chosen surface. */
  keywords: string[];
  /** Where the keyword must appear:
   *   'any'         → industry + title + company + description  (default)
   *   'company'     → company name ONLY — workplace signal, no description noise
   *   'title'       → role title only
   *   'industry'    → classifier industry only
   *   'description' → description body only
   *   'company_or_title' → company OR title — high-confidence workplace + role
   */
  surface?: 'any' | 'industry' | 'title' | 'description' | 'company' | 'company_or_title';
  /** Patterns whose presence anywhere in the haystack DISQUALIFIES the
   *  match — used to filter false positives like "high school diploma
   *  required" matching the workplace word "school". */
  notKeywords?: string[];
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
    { level: 'high', ruleId: 'dp_pharmacy_or_meds',  keywords: ['pharmacy', 'pharmacist', 'pharmaceutical', 'controlled substance', 'medication handling', 'dispensary'], reason: 'Role involves pharmacy access or medication handling; the exact offense and state license rules require review.', surface: 'any' },
    { level: 'high', ruleId: 'dp_school_or_minors',  keywords: ['school', 'teacher', 'k-12', 'kindergarten', 'childcare', 'daycare', 'youth program'], reason: 'School and child-care environments require offense-, date-, provider-, and jurisdiction-specific clearance review.', surface: 'any' },
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
    { level: 'high', ruleId: 'dd_pharmacy_or_meds',  keywords: ['pharmacy', 'pharmacist', 'pharmaceutical', 'controlled substance', 'medication handling', 'dispensary'], reason: 'Medication and controlled-substance access creates a strong duty conflict and may trigger license or exclusion review.', surface: 'any' },
    { level: 'high', ruleId: 'dd_schools_corrections_le', keywords: ['school', 'teacher', 'k-12', 'kindergarten', 'childcare', 'corrections', 'detention', 'police', 'sheriff'], reason: 'This setting uses heightened screening; the exact offense, date, role, and jurisdiction determine eligibility.', surface: 'any' },
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
    // Workplace types — match company OR title (not free-text description)
    // so "high school diploma required" doesn't trip workplace detection.
    { level: 'high', ruleId: 'vo_workplace_restricted',
      keywords: ['school district', 'public schools', 'unified school', 'elementary school', 'middle school',
                 'kindergarten', 'preschool', 'daycare', 'childcare center', 'child care center',
                 'children\u2019s hospital', 'childrens hospital', 'pediatric', 'ymca', 'ywca',
                 'boys & girls club', 'boys and girls club', 'head start', 'foster care', 'group home',
                 'youth correctional', 'juvenile detention', 'juvenile justice', 'nursing home',
                 'assisted living', 'memory care', 'long term care', 'long-term care', 'hospice'],
      reason: 'Workplace serves children, residents, or vulnerable populations. Roles at these workplaces typically require fingerprint clearance regardless of duties.',
      surface: 'company_or_title' },
    { level: 'high', ruleId: 'vo_children',
      keywords: ['teacher', 'teacher aide', 'school bus', 'k-12', 'youth program', 'after school', 'after-school',
                 'camp counselor', 'tutor', 'classroom aide', 'preschool', 'daycare'],
      reason: 'Roles with access to minors require fingerprint-based clearance and exact state/provider eligibility review.',
      surface: 'title' },
    { level: 'high', ruleId: 'vo_vulnerable_adults',
      keywords: ['elder care', 'residential care', 'vulnerable adult', 'in home', 'in-home', 'home visit'],
      reason: 'Roles serving vulnerable adults or residents require exact offense, facility, and state-rule review.',
      surface: 'any' },
    { level: 'high', ruleId: 'vo_healthcare_direct',
      keywords: ['patient facing', 'patient-facing', 'home health', 'caregiver', 'cna',
                 'personal care aide', 'home health aide', 'medical assistant'],
      reason: 'Direct patient care roles weigh violent convictions heavily.',
      surface: 'title' },
    { level: 'high', ruleId: 'vo_security_or_le',
      keywords: ['security guard', 'security officer', 'corrections officer', 'detention officer',
                 'police officer', 'sheriff', 'armed security', 'armored car', 'armed transport'],
      reason: 'Security, law-enforcement, and corrections roles use agency-specific suitability and licensing rules.',
      surface: 'any' },
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
    // Workplace types — match on COMPANY or TITLE only, not free-text
    // description. This avoids false positives like the description
    // saying "high school diploma required" tripping the workplace word
    // "school" on a job that has nothing to do with a school.
    { level: 'high', ruleId: 'rr_workplace_restricted',
      keywords: ['school district', 'public schools', 'school board', 'unified school', 'independent school',
                 'elementary school', 'middle school', 'kindergarten', 'preschool', 'daycare',
                 'childcare center', 'child care center', 'children\u2019s hospital', 'childrens hospital',
                 'pediatric', 'ymca', 'ywca', 'boys & girls club', 'boys and girls club', 'head start',
                 'foster care', 'department of children', 'department of family', 'group home', 'youth services',
                 'youth correctional', 'juvenile detention', 'juvenile justice', 'parks and recreation department'],
      reason: 'Workplace is a restricted setting. Registry status, exact duties, provider type, and jurisdiction must be verified before relying on the match.',
      surface: 'company_or_title' },

    // Title-level role markers that strongly indicate access to minors
    // regardless of company.
    { level: 'high', ruleId: 'rr_role_minors',
      keywords: ['teacher', 'teacher aide', 'school bus', 'school transportation', 'preschool', 'daycare',
                 'childcare worker', 'after school', 'after-school', 'youth program', 'camp counselor',
                 'tutor', 'classroom aide', 'pediatric'],
      reason: 'Role title indicates work with minors or in a school environment. Caseworker or legal review is recommended.',
      surface: 'title' },

    // Vulnerable-population workplace markers (residences, eldercare, hospice)
    // — match company OR title; veto the noise "high school".
    { level: 'high', ruleId: 'rr_vulnerable_pop',
      keywords: ['elder care', 'nursing home', 'assisted living', 'residential care', 'long term care', 'long-term care',
                 'memory care', 'rehabilitation center', 'home health', 'hospice', 'group home',
                 'vulnerable adult', 'home visit'],
      reason: 'Workplace serves vulnerable-population settings or grants residential access. Additional background review may apply.',
      surface: 'company_or_title' },

    // Direct patient-care job titles (CNA, caregiver) — restricted regardless of employer.
    { level: 'high', ruleId: 'rr_role_direct_care',
      keywords: ['cna', 'caregiver', 'patient facing', 'patient-facing', 'home health aide', 'medical assistant',
                 'nurse aide'],
      reason: 'Direct patient or resident care typically requires fingerprint-based clearance. Caseworker review recommended.',
      surface: 'title' },

    // Healthcare facility employer marker — title can be back-of-house but
    // employer is a hospital / health system → still restricted.
    { level: 'high', ruleId: 'rr_healthcare_employer',
      keywords: ['hospital', 'medical center', 'health system', 'clinic', 'medical group'],
      reason: 'Workplace is a healthcare facility. Most healthcare workplaces require fingerprint-based clearance.',
      surface: 'company' },

    // Unsupervised public-/residential-access role markers.
    { level: 'high', ruleId: 'rr_public_facing_unsup',
      keywords: ['rideshare', 'school bus driver', 'school transportation', 'delivery driver into home',
                 'door to door', 'door-to-door', 'in home delivery', 'in-home delivery', 'in home installation',
                 'in-home installation'],
      reason: 'Roles with unsupervised public or residential access may be restricted.',
      surface: 'any' },

    // Customer-facing — medium concern, depends on workplace.
    { level: 'medium', ruleId: 'rr_customer_facing',
      keywords: ['customer service', 'retail associate', 'cashier', 'host', 'reception', 'concierge', 'front desk'],
      reason: 'Customer-facing environments may carry restrictions depending on the workplace.',
      surface: 'title' },

    // Low concern — back-of-house, manual labor, remote.
    { level: 'low', ruleId: 'rr_low_risk',
      keywords: ['warehouse', 'construction laborer', 'manufacturing', 'sanitation', 'janitorial', 'cleaning office',
                 'cook', 'back of house', 'back-of-house', 'remote work', 'landscaping', 'groundskeeper'],
      reason: 'Roles with no vulnerable-population or restricted-site access typically present low concern.',
      surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'Restrictions may apply depending on the workplace and applicable state law. Caseworker review recommended.',
};

const propertyTheft: ConvictionMatrix = {
  description: 'High concern when the role involves cash handling, inventory custody, package handling, residential access, or fiduciary responsibility.',
  rules: [
    { level: 'high', ruleId: 'pt_cash_or_finance',     keywords: ['cash[- ]handling', 'bank teller', 'cashier', 'fiduciary', 'banking', 'accounting', 'payroll', 'bookkeeping', 'finance', 'controller'], reason: 'Cash-handling or financial-record duties create a direct relevance concern; regulated banking rules depend on the exact offense and dates.', surface: 'any' },
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
    { level: 'high', ruleId: 'br_residential_access',   keywords: ['in[- ]home services', 'home visit', 'residential access', 'property management', 'apartment maintenance', 'janitorial in private', 'locksmith'], reason: 'Unsupervised residential access creates a direct duty-relevance concern and calls for individualized review.', surface: 'any' },
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
    { level: 'high', ruleId: 'ff_finance_core',         keywords: ['banking', 'bank teller', 'accounting', 'bookkeeping', 'payroll', 'finance', 'controller', 'fiduciary', 'cpa', 'auditor', 'tax preparer'], reason: 'Finance and accounting duties create direct relevance; banking, securities, insurance, and licenses each use different legal rules.', surface: 'any' },
    { level: 'high', ruleId: 'ff_insurance_procurement', keywords: ['insurance', 'claims adjuster', 'underwriter', 'procurement', 'purchasing', 'government benefits'], reason: 'Insurance / procurement / benefits roles weigh fraud convictions heavily.', surface: 'any' },
    { level: 'high', ruleId: 'ff_confidential_records', keywords: ['fiduciary', 'access to financial records', 'confidential personal information', 'pii', 'access to financial', 'access to confidential'], reason: 'Access to confidential or financial records creates a strong duty-relevance concern requiring targeted review.', surface: 'any' },
    { level: 'medium', ruleId: 'ff_admin_sales',        keywords: ['office administration', 'sales', 'customer support', 'data entry'], reason: 'Office / sales roles may apply additional background review.', surface: 'any' },
    { level: 'low',  ruleId: 'ff_low_risk',             keywords: ['construction', 'manufacturing', 'food service', 'warehouse', 'sanitation', 'cleaning', 'landscaping', 'cook', 'back[- ]of[- ]house', 'remote labor'], reason: 'Manual / labor roles typically present low concern.', surface: 'any' },
  ],
  defaultLevel: 'medium',
  defaultReason: 'Background check may apply; review the duties for financial or fiduciary responsibility.',
};

const weaponsRelated: ConvictionMatrix = {
  description: 'High concern in security, law enforcement, corrections, defense contractors, armored transport, and any role requiring weapons or firearms eligibility.',
  rules: [
    { level: 'high', ruleId: 'wp_security_le_corr',     keywords: ['security guard', 'security officer', 'armed', 'firearm', 'unarmed security', 'police', 'sheriff', 'corrections', 'detention'], reason: 'Security, law-enforcement, and corrections duties require firearm, license, and agency-specific eligibility review.', surface: 'any' },
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
 * Normalize a string so substring matching is robust to common
 * variations: case, hyphen-vs-space, smart vs straight quotes, and
 * apostrophes (so "Children's" and "Childrens" both reach the matcher).
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B'\u2032`]/g, '') // strip apostrophes / single quotes (curly + straight)
    .replace(/[_\-]+/g, ' ')                             // hyphens / underscores → space
    .replace(/\s+/g, ' ')                                  // collapse whitespace
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
 *
 * The "any" surface scans industry + title + COMPANY + description. The
 * company field matters: a custodian role at "Renton School District 403"
 * has no "school" keyword in the title — but the company name is the
 * decisive signal that the workplace is school grounds. Skipping the
 * company string was the biggest false-negative class in early QA.
 */
export function evaluateMatrix(
  conviction: ConvictionType,
  jobInput: { industry?: string | null; title?: string | null; company?: string | null; description?: string | null },
): { worst: MatrixMatch; all: MatrixMatch[]; matrixDescription: string } {
  const matrix = CONVICTION_MATRIX[conviction];
  const surfaces = {
    industry:    normalize(jobInput.industry ?? ''),
    title:       normalize(jobInput.title ?? ''),
    company:     normalize(jobInput.company ?? ''),
    description: normalize(jobInput.description ?? ''),
  };
  const corpusAll = `${surfaces.industry}\n${surfaces.title}\n${surfaces.company}\n${surfaces.description}`;
  const companyOrTitle = `${surfaces.company}\n${surfaces.title}`;

  const haystackFor = (surface: NonNullable<ConcernRule['surface']>): string => {
    switch (surface) {
      case 'any':              return corpusAll;
      case 'industry':         return surfaces.industry;
      case 'title':            return surfaces.title;
      case 'company':          return surfaces.company;
      case 'description':      return surfaces.description;
      case 'company_or_title': return companyOrTitle;
    }
  };

  const all: MatrixMatch[] = [];

  for (const rule of matrix.rules) {
    const haystack = haystackFor(rule.surface ?? 'any');
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
    if (!hit) continue;

    // Veto: if any notKeyword pattern appears anywhere in the haystack,
    // discard this match. Used to suppress noise like "high school diploma"
    // tripping the workplace word "school".
    if (rule.notKeywords && rule.notKeywords.length > 0) {
      const vetoed = rule.notKeywords.some((nk) =>
        expandKeyword(nk).some((v) => v && haystack.includes(v))
      );
      if (vetoed) continue;
    }

    all.push({ level: rule.level, ruleId: rule.ruleId, reason: rule.reason, matchedKeyword: hit });
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
