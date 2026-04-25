/**
 * Acceptance tests for the conviction-aware compatibility engine.
 *
 * Each test covers one of the 20 cases in the upgrade spec. Run with:
 *   pnpm --filter @dxp/shared test
 *
 * Naming convention: `convictionType + jobShape -> expected chance band`.
 */
import { describe, it, expect } from '@jest/globals';
import { scoreJobCompatibility } from '../scoring';
import {
  CONVICTION_LABELS,
  CompatibilityRating,
  CandidateProfile,
  JobInput,
} from '../types';

// ───────────────────────────────────────────────────────────────────
// Test fixtures
// ───────────────────────────────────────────────────────────────────

const baseProfile: CandidateProfile = {
  certifications: [],
  workExperienceIndustries: [],
  desiredIndustries: [],
  excludedIndustries: [],
  hasPendingCharges: false,
  expungedOrSealed: false,
  supervisionStatus: 'none',
  educationLevel: 'high_school_or_ged',
  willingToRelocate: false,
  transportationAccess: true,
};

const baseJob: JobInput = {
  id: 'job-1',
  title: 'Generic Job',
  company: 'Generic Co',
  description: 'A generic role with no special requirements.',
  industry: 'manufacturing',
  remote: false,
  riskTier: 'LOW',
  excludesFelons: false,
  backgroundCheckLikely: false,
  isApprenticeship: false,
  locationRegion: 'OH',
};

function profile(overrides: Partial<CandidateProfile>): CandidateProfile {
  return { ...baseProfile, ...overrides };
}

function job(overrides: Partial<JobInput>): JobInput {
  return { ...baseJob, ...overrides };
}

function score(p: CandidateProfile, j: JobInput): CompatibilityRating {
  return scoreJobCompatibility(p, j);
}

// ───────────────────────────────────────────────────────────────────
// 1. DUI/DWI + CDL driver = Low Chance
// ───────────────────────────────────────────────────────────────────
describe('compatibility engine — acceptance', () => {
  it('1. DUI/DWI + CDL driver = Low Chance', () => {
    const r = score(
      profile({ convictionType: 'dui_dwi', releaseDate: 2024 }),
      job({
        title: 'CDL Class A Truck Driver',
        description: 'Long-haul commercial driver. CDL required. Clean driving record required. DOT-regulated safety-sensitive position.',
        industry: 'transportation',
      }),
    );
    expect(r.chance).toBe('low');
    expect(r.label).toBe('Challenging Match');
    expect(r.riskFactors.join(' ')).toMatch(/clean driving|cdl|dot|safety/i);
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. DUI/DWI + remote customer support = High or Medium
  // ─────────────────────────────────────────────────────────────────
  it('2. DUI/DWI + remote customer support = High or Medium Chance', () => {
    const r = score(
      profile({ convictionType: 'dui_dwi', releaseDate: 2018 }),
      job({
        title: 'Customer Support Representative — Remote',
        description: 'Work-from-home customer service. No driving required. Equal opportunity employer.',
        industry: 'customer_service',
        remote: true,
      }),
    );
    expect(['high', 'medium']).toContain(r.chance);
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. Property/theft + bank teller = Low
  // ─────────────────────────────────────────────────────────────────
  it('3. Property/theft + bank teller = Low Chance', () => {
    const r = score(
      profile({ convictionType: 'property_theft', releaseDate: 2023 }),
      job({
        title: 'Bank Teller',
        description: 'Customer-facing teller responsible for cash handling, deposits, and account inquiries. Background check required.',
        industry: 'finance',
      }),
    );
    expect(r.chance).toBe('low');
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. Property/theft + construction laborer = High
  // ─────────────────────────────────────────────────────────────────
  it('4. Property/theft + construction laborer = High Chance', () => {
    const r = score(
      profile({ convictionType: 'property_theft', releaseDate: 2017, certifications: ['OSHA 10'] }),
      job({
        title: 'Construction Laborer',
        description: 'General construction labor. Lifting, mixing, basic tools. Fair-chance employer.',
        industry: 'construction',
      }),
    );
    expect(['high', 'medium']).toContain(r.chance);
    expect(r.score).toBeGreaterThan(60);
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. Burglary + in-home maintenance = Low or Medium-Low
  // ─────────────────────────────────────────────────────────────────
  it('5. Burglary + in-home maintenance = Low or Medium-Low Chance', () => {
    const r = score(
      profile({ convictionType: 'burglary', releaseDate: 2022 }),
      job({
        title: 'In-Home Appliance Repair Technician',
        description: 'Travel to customer residences for in-home appliance installation and repair. Valid driver\u2019s license required.',
        industry: 'in_home_services',
      }),
    );
    expect(['low', 'medium']).toContain(r.chance);
    if (r.chance === 'medium') expect(r.score).toBeLessThan(60);
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. Financial fraud + payroll assistant = Low
  // ─────────────────────────────────────────────────────────────────
  it('6. Financial fraud + payroll assistant = Low Chance', () => {
    const r = score(
      profile({ convictionType: 'financial_fraud', releaseDate: 2022 }),
      job({
        title: 'Payroll Assistant',
        description: 'Process payroll, manage timesheets, access to financial records and confidential personal information. Background investigation required.',
        industry: 'finance',
      }),
    );
    expect(r.chance).toBe('low');
  });

  // ─────────────────────────────────────────────────────────────────
  // 7. Financial fraud + warehouse associate = Medium or High
  // ─────────────────────────────────────────────────────────────────
  it('7. Financial fraud + warehouse associate = Medium or High Chance', () => {
    const r = score(
      profile({ convictionType: 'financial_fraud', releaseDate: 2017 }),
      job({
        title: 'Warehouse Associate',
        description: 'Pick, pack, and ship orders. Operate forklift. No financial responsibilities.',
        industry: 'warehousing',
      }),
    );
    expect(['high', 'medium']).toContain(r.chance);
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. Violence + childcare worker = Low
  // ─────────────────────────────────────────────────────────────────
  it('8. Violence + childcare worker = Low Chance', () => {
    const r = score(
      profile({ convictionType: 'violent_offense', releaseDate: 2020 }),
      job({
        title: 'Childcare Worker',
        description: 'Care for children ages 2–5 in a daycare setting. Fingerprinting required.',
        industry: 'childcare',
      }),
    );
    expect(r.chance).toBe('low');
  });

  // ─────────────────────────────────────────────────────────────────
  // 9. Violence + manufacturing role = Medium or High
  // ─────────────────────────────────────────────────────────────────
  it('9. Violence + manufacturing role = Medium or High Chance', () => {
    const r = score(
      profile({ convictionType: 'violent_offense', releaseDate: 2016 }),
      job({
        title: 'Production Operator',
        description: 'Operate production-line machinery in a manufacturing plant.',
        industry: 'manufacturing',
      }),
    );
    expect(['high', 'medium']).toContain(r.chance);
  });

  // ─────────────────────────────────────────────────────────────────
  // 10. Registry-related + school job = Low
  // ─────────────────────────────────────────────────────────────────
  it('10. Registry-related + school job = Low Chance', () => {
    const r = score(
      profile({ convictionType: 'registry_related', releaseDate: 2019 }),
      job({
        title: 'School Custodian',
        description: 'Custodial duties at an elementary school during school hours. Fingerprinting required.',
        industry: 'education',
      }),
    );
    expect(r.chance).toBe('low');
    // Acceptance criteria 19: never use stigmatizing terms in user-facing strings.
    const allUserText = [
      r.summary,
      ...r.riskFactors,
      ...r.positiveFactors,
      ...r.possibleBarriers,
      ...r.chanceImprovers,
      r.recommendedNextStep,
      ...r.caseworkerNotes,
    ].join(' ').toLowerCase();
    expect(allUserText).not.toMatch(/\bsex offense\b|\bsexual offense\b|\bsex offender\b|\bregistrable sex offense\b/);
  });

  // ─────────────────────────────────────────────────────────────────
  // 11. Drug possession + general labor = Medium or High
  // ─────────────────────────────────────────────────────────────────
  it('11. Drug possession + general labor = Medium or High Chance', () => {
    const r = score(
      profile({ convictionType: 'drug_possession', releaseDate: 2018 }),
      job({
        title: 'General Laborer',
        description: 'General labor at a construction site. No driving, no controlled substances.',
        industry: 'construction',
      }),
    );
    expect(['high', 'medium']).toContain(r.chance);
  });

  // ─────────────────────────────────────────────────────────────────
  // 12. Drug distribution + pharmacy tech = Low
  // ─────────────────────────────────────────────────────────────────
  it('12. Drug distribution + pharmacy tech = Low Chance', () => {
    const r = score(
      profile({ convictionType: 'drug_distribution', releaseDate: 2021 }),
      job({
        title: 'Pharmacy Technician',
        description: 'Assist pharmacists with controlled substances and medication handling at a hospital pharmacy. Fingerprinting required.',
        industry: 'healthcare',
      }),
    );
    expect(r.chance).toBe('low');
  });

  // ─────────────────────────────────────────────────────────────────
  // 13. Weapons + security guard = Low
  // ─────────────────────────────────────────────────────────────────
  it('13. Weapons + security guard = Low Chance', () => {
    const r = score(
      profile({ convictionType: 'weapons_related', releaseDate: 2022 }),
      job({
        title: 'Armed Security Officer',
        description: 'Provide armed security at a corporate campus. Firearm eligibility required.',
        industry: 'security',
      }),
    );
    expect(r.chance).toBe('low');
  });

  // ─────────────────────────────────────────────────────────────────
  // 14. Clean-background phrase significantly lowers score
  // ─────────────────────────────────────────────────────────────────
  it('14. "Clean background required" phrase significantly lowers score', () => {
    const benign = score(
      profile({ convictionType: 'drug_possession', releaseDate: 2017 }),
      job({ title: 'General Laborer', description: 'General labor.', industry: 'construction' }),
    );
    const strict = score(
      profile({ convictionType: 'drug_possession', releaseDate: 2017 }),
      job({ title: 'General Laborer', description: 'General labor. Clean background required.', industry: 'construction' }),
    );
    expect(benign.score - strict.score).toBeGreaterThanOrEqual(15);
  });

  // ─────────────────────────────────────────────────────────────────
  // 15. Fair-chance language improves score but does NOT override hard barriers
  // ─────────────────────────────────────────────────────────────────
  it('15. Fair-chance language improves score but does not override hard barriers', () => {
    const a = score(
      profile({ convictionType: 'drug_possession', releaseDate: 2018 }),
      job({ title: 'Warehouse Associate', description: 'Warehouse work.', industry: 'warehousing' }),
    );
    const b = score(
      profile({ convictionType: 'drug_possession', releaseDate: 2018 }),
      job({ title: 'Warehouse Associate', description: 'Warehouse work. Fair-chance employer.', industry: 'warehousing' }),
    );
    expect(b.score).toBeGreaterThan(a.score);

    // Hard barrier should still cap.
    const c = score(
      profile({ convictionType: 'drug_possession', releaseDate: 2018 }),
      job({ title: 'Warehouse Associate', description: 'Fair-chance employer. Clean background required.', industry: 'warehousing' }),
    );
    expect(c.score).toBeLessThan(b.score);
    expect(c.chance).toBe('low');
  });

  // ─────────────────────────────────────────────────────────────────
  // 16. Expunged/sealed improves score but does not erase hard legal barriers
  // ─────────────────────────────────────────────────────────────────
  it('16. Expunged/sealed improves score but does not erase hard legal barriers', () => {
    const without = score(
      profile({ convictionType: 'drug_possession', releaseDate: 2018, expungedOrSealed: false }),
      job({ title: 'Warehouse Associate', description: 'Warehouse work.', industry: 'warehousing' }),
    );
    const withSeal = score(
      profile({ convictionType: 'drug_possession', releaseDate: 2018, expungedOrSealed: true }),
      job({ title: 'Warehouse Associate', description: 'Warehouse work.', industry: 'warehousing' }),
    );
    expect(withSeal.score).toBeGreaterThanOrEqual(without.score);

    const withSealHardBarrier = score(
      profile({ convictionType: 'drug_possession', releaseDate: 2018, expungedOrSealed: true }),
      job({ title: 'Pharmacy Tech', description: 'Pharmacy work with controlled substances. Clean background required.', industry: 'healthcare' }),
    );
    expect(withSealHardBarrier.chance).toBe('low');
  });

  // ─────────────────────────────────────────────────────────────────
  // 17. Old conviction (7+ years) improves score
  // ─────────────────────────────────────────────────────────────────
  it('17. Conviction 7+ years ago improves score', () => {
    const old = score(
      profile({ convictionType: 'drug_possession', releaseDate: new Date().getFullYear() - 8 }),
      job({ title: 'Warehouse Associate', description: 'Warehouse.', industry: 'warehousing' }),
    );
    const recent = score(
      profile({ convictionType: 'drug_possession', releaseDate: new Date().getFullYear() }),
      job({ title: 'Warehouse Associate', description: 'Warehouse.', industry: 'warehousing' }),
    );
    expect(old.score).toBeGreaterThan(recent.score);
  });

  // ─────────────────────────────────────────────────────────────────
  // 18. Pending charges reduce score
  // ─────────────────────────────────────────────────────────────────
  it('18. Pending charges reduce score', () => {
    const noPending = score(
      profile({ convictionType: 'property_theft', releaseDate: 2018 }),
      job({ title: 'Construction Laborer', description: 'General construction labor.', industry: 'construction' }),
    );
    const pending = score(
      profile({ convictionType: 'property_theft', releaseDate: 2018, hasPendingCharges: true }),
      job({ title: 'Construction Laborer', description: 'General construction labor.', industry: 'construction' }),
    );
    expect(pending.score).toBeLessThan(noPending.score);
  });

  // ─────────────────────────────────────────────────────────────────
  // 19. UI strings never contain stigmatizing terms
  // ─────────────────────────────────────────────────────────────────
  it('19. user-facing strings never contain "sex offense" / "sexual offense" / "sex offender" / "registrable sex offense"', () => {
    for (const conviction of Object.keys(CONVICTION_LABELS) as Array<keyof typeof CONVICTION_LABELS>) {
      const r = score(profile({ convictionType: conviction, releaseDate: 2020 }), job({}));
      const allUserText = [
        r.summary,
        ...r.riskFactors,
        ...r.positiveFactors,
        ...r.possibleBarriers,
        ...r.chanceImprovers,
        r.recommendedNextStep,
        ...r.caseworkerNotes,
      ].join(' ').toLowerCase();
      expect(allUserText).not.toMatch(/\bsex offense\b|\bsexual offense\b|\bsex offender\b|\bregistrable sex offense\b/);
    }
    // Labels also clean.
    for (const label of Object.values(CONVICTION_LABELS)) {
      expect(label.toLowerCase()).not.toMatch(/\bsex offense\b|\bsexual offense\b|\bsex offender\b|\bregistrable sex offense\b/);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // 20. UI label for registry-related conviction is "Registry-related conviction"
  // ─────────────────────────────────────────────────────────────────
  it('20. CONVICTION_LABELS.registry_related === "Registry-related conviction"', () => {
    expect(CONVICTION_LABELS.registry_related).toBe('Registry-related conviction');
  });

  // ─────────────────────────────────────────────────────────────────
  // Bonus: deterministic — same inputs produce identical outputs
  // ─────────────────────────────────────────────────────────────────
  it('engine is deterministic across runs', () => {
    const args = [profile({ convictionType: 'drug_possession', releaseDate: 2017 }), job({ title: 'General Laborer', description: 'Construction work.', industry: 'construction' })] as const;
    const a = score(args[0], args[1]);
    const b = score(args[0], args[1]);
    expect(a.score).toBe(b.score);
    expect(a.summary).toBe(b.summary);
    expect(a.auditTrail.length).toBe(b.auditTrail.length);
  });
});
