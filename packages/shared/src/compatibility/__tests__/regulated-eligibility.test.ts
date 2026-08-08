import { describe, expect, it } from '@jest/globals';
import { assessRegulatedEligibility } from '../regulated-eligibility';
import type { CandidateProfile, JobInput } from '../types';

const job = (overrides: Partial<JobInput>): JobInput => ({
  id: 'job', title: 'Job', company: 'Employer', description: '', industry: 'services', locationRegion: 'CA', ...overrides,
});
const person = (overrides: Partial<CandidateProfile>): CandidateProfile => ({
  convictionType: 'other', convictionCategory: 'FELONY', convictionDate: 2024, releaseDate: 2024, ...overrides,
});

describe('regulated occupational eligibility', () => {
  it('distinguishes K-12 state review from a universal prohibition', () => {
    const result = assessRegulatedEligibility(
      person({ convictionType: 'violent_offense' }),
      job({ title: 'School Custodian', company: 'Unified School District', industry: 'education' }),
    );
    expect(result.highestStatus).toBe('license_or_agency_review');
    expect(result.findings.some((f) => f.ruleId === 'state.k12_clearance')).toBe(true);
  });

  it('applies the federal covered-child-care rule to registry status', () => {
    const result = assessRegulatedEligibility(
      person({ convictionType: 'registry_related' }),
      job({ title: 'Daycare Assistant', industry: 'childcare' }),
    );
    expect(result.highestStatus).toBe('likely_disqualified');
    expect(result.findings[0].sources[0].citation).toContain('9858f');
  });

  it('does not claim every violent conviction bars all medical work', () => {
    const result = assessRegulatedEligibility(
      person({ convictionType: 'violent_offense', exactOffense: null }),
      job({ title: 'Hospital Facilities Technician', industry: 'healthcare' }),
    );
    expect(result.highestStatus).toBe('license_or_agency_review');
    expect(result.findings.map((f) => f.title).join(' ')).toMatch(/license|facility/i);
  });

  it('routes verified current HHS-OIG exclusion to likely restriction', () => {
    const result = assessRegulatedEligibility(
      person({ convictionType: 'financial_fraud', currentlyExcludedFromFederalHealthcare: true }),
      job({ title: 'Medical Biller', industry: 'healthcare' }),
    );
    expect(result.highestStatus).toBe('likely_disqualified');
  });

  it('applies FDIC time exceptions rather than a lifetime banking ban', () => {
    const recent = assessRegulatedEligibility(
      person({ convictionType: 'financial_fraud', convictionDate: 2024, releaseDate: 2024 }),
      job({ title: 'Bank Teller', industry: 'finance' }),
    );
    const older = assessRegulatedEligibility(
      person({ convictionType: 'financial_fraud', convictionDate: 2010, releaseDate: 2015 }),
      job({ title: 'Bank Teller', industry: 'finance' }),
    );
    expect(recent.highestStatus).toBe('waiver_or_approval_required');
    expect(older.highestStatus).toBe('individualized_review');
  });

  it('applies the ten-year FINRA process to any felony', () => {
    const result = assessRegulatedEligibility(
      person({ convictionType: 'dui_dwi', convictionDate: 2024 }),
      job({ title: 'FINRA Registered Representative', industry: 'finance' }),
    );
    expect(result.highestStatus).toBe('waiver_or_approval_required');
    expect(result.findings.some((f) => f.ruleId === 'federal.finra_10yr')).toBe(true);
  });

  it('recognizes the airport ten-year secure-access list', () => {
    const result = assessRegulatedEligibility(
      person({ convictionType: 'burglary', convictionDate: 2024 }),
      job({ title: 'Airport Ramp Agent', description: 'SIDA badge and unescorted airport access required.', industry: 'transportation' }),
    );
    expect(result.highestStatus).toBe('likely_disqualified');
  });

  it('treats federal clearance as whole-person review, not automatic denial', () => {
    const result = assessRegulatedEligibility(
      person({ convictionType: 'weapons_related' }),
      job({ title: 'Federal IT Analyst', description: 'Top Secret clearance required.', industry: 'government' }),
    );
    expect(result.highestStatus).toBe('individualized_review');
    expect(result.findings.some((f) => f.ruleId === 'federal.whole_person_review')).toBe(true);
  });

  it('reports missing facts that limit legal accuracy', () => {
    const result = assessRegulatedEligibility(
      { convictionType: 'property_theft' },
      job({ title: 'Warehouse Associate', locationRegion: null }),
    );
    expect(result.missingFacts).toEqual(expect.arrayContaining(['exact offense name/statute', 'job state']));
  });
});
