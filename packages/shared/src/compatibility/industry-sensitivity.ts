/**
 * Industry sensitivity table — how much scrutiny / regulatory risk a job
 * in a given industry typically carries, independent of the candidate's
 * conviction. Drives the `industrySensitivity` score component (max 10 pts).
 *
 * Higher number = more sensitive industry = lower compatibility score.
 * Range: 0–4. Default for unknown industries: 1.
 */

export type SensitivityLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Map of canonical industry codes → sensitivity level. Industry codes
 * match the values our classifier sets on Job rows
 * (`apps/api/src/classification/classifier.service.ts`).
 *
 *  0 — minimal scrutiny (construction, sanitation, etc.)
 *  1 — low (manufacturing, food service back-of-house, warehousing)
 *  2 — medium (retail, hospitality, customer-facing roles, logistics)
 *  3 — high (healthcare, finance, education, government, in-home services,
 *           IT/cybersecurity with elevated access)
 *  4 — very high (security, law enforcement, corrections, defense,
 *                 childcare, schools)
 */
export const INDUSTRY_SENSITIVITY: Record<string, SensitivityLevel> = {
  // 0 — minimal
  construction: 0,
  landscaping: 0,
  sanitation: 0,
  grounds_maintenance: 0,

  // 1 — low
  manufacturing: 1,
  warehousing: 1,
  food_service: 1,
  cleaning: 1,
  agriculture: 1,
  forestry: 1,
  general_labor: 1,
  remote: 1,

  // 2 — medium
  retail: 2,
  hospitality: 2,
  logistics: 2,
  customer_service: 2,
  services: 2,

  // medium-high (transportation can require CDL + clean record, hence 3)
  transportation: 3,

  // 3 — high
  healthcare: 3,
  education: 3,
  finance: 3,
  insurance: 3,
  government: 3,
  in_home_services: 3,
  property_management: 3,
  it_general: 3,
  cybersecurity: 3,
  legal: 3,
  utilities: 3,

  // 4 — very high
  security: 4,
  law_enforcement: 4,
  corrections: 4,
  defense: 4,
  aerospace: 4,
  childcare: 4,
  schools: 4,
};

/** Default sensitivity when the industry is unknown / not in the table. */
export const DEFAULT_SENSITIVITY: SensitivityLevel = 1;

/** Lookup helper that normalizes the industry string before mapping. */
export function getIndustrySensitivity(industry: string | null | undefined): SensitivityLevel {
  if (!industry) return DEFAULT_SENSITIVITY;
  const key = industry.toLowerCase().trim();
  return INDUSTRY_SENSITIVITY[key] ?? DEFAULT_SENSITIVITY;
}

/**
 * Convert a sensitivity level into a 0..1 contribution where 0 is "no
 * concern" (max points) and 1 is "very high concern" (zero points).
 * Used by the scoring engine to translate sensitivity into points.
 */
export function sensitivityToContribution(level: SensitivityLevel): number {
  // 0 → 1.0 (full points), 4 → 0.0 (no points). Linear.
  return Math.max(0, Math.min(1, 1 - level / 4));
}
