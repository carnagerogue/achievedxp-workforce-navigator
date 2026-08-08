import { describe, it, expect } from '@jest/globals';
import { isOffenseHardBlocked, convictionForOffenseType, OFFENSE_HARD_FILTERS } from '../offense-hard-filters';
import { CONVICTION_TYPE_ORDER } from '../types';

describe('evidence-backed hard filters', () => {
  it('retains one compatibility entry per conviction type', () => {
    expect(Object.keys(OFFENSE_HARD_FILTERS).sort()).toEqual([...CONVICTION_TYPE_ORDER].sort());
  });

  it('does not turn a broad school category into a universal legal ban', () => {
    expect(isOffenseHardBlocked(
      { convictionType: 'violent_offense', convictionCategory: 'FELONY' },
      { industry: 'education', title: 'School Custodian' },
    ).blocked).toBe(false);
  });

  it('does flag registry status for covered child-care work', () => {
    const result = isOffenseHardBlocked(
      { convictionType: 'registry_related', convictionCategory: 'FELONY' },
      { industry: 'childcare', title: 'Daycare Teacher' },
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/child-care/i);
  });

  it('does not treat a broad fraud label as an automatic ban from every bank job', () => {
    expect(isOffenseHardBlocked(
      { convictionType: 'financial_fraud', convictionCategory: 'FELONY', convictionDate: 2025 },
      { industry: 'finance', title: 'Bank Teller' },
    ).blocked).toBe(false);
  });

  it('flags firearm possession duties for a felony unless restoration is known', () => {
    const result = isOffenseHardBlocked(
      { convictionType: 'property_theft', convictionCategory: 'FELONY' },
      { industry: 'security', title: 'Armed Security Guard', description: 'Must carry a firearm.' },
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/firearm/i);
  });

  it('does not treat every DUI as a permanent commercial-driving ban', () => {
    expect(isOffenseHardBlocked(
      { convictionType: 'dui_dwi', convictionCategory: 'FELONY', convictionDate: 2015 },
      { industry: 'transportation', title: 'CDL Truck Driver' },
    ).blocked).toBe(false);
  });

  it('does not infer an HHS-OIG exclusion from a broad drug category alone', () => {
    expect(isOffenseHardBlocked(
      { convictionType: 'drug_distribution', convictionCategory: 'FELONY' },
      { industry: 'healthcare', title: 'Pharmacy Technician' },
    ).blocked).toBe(false);
  });

  it('null and undefined convictions never block', () => {
    expect(isOffenseHardBlocked(null, { industry: 'education', title: 'Teacher' }).blocked).toBe(false);
    expect(isOffenseHardBlocked(undefined, { industry: 'education', title: 'Teacher' }).blocked).toBe(false);
  });
});

describe('convictionForOffenseType', () => {
  it('maps stored enum values to engine conviction types', () => {
    expect(convictionForOffenseType('REGISTRY_RELATED')).toBe('registry_related');
    expect(convictionForOffenseType('PROPERTY_BURGLARY')).toBe('burglary');
    expect(convictionForOffenseType('VIOLENT')).toBe('violent_offense');
    expect(convictionForOffenseType('DUI')).toBe('dui_dwi');
  });

  it('maps the legacy SEX_OFFENSE value to registry_related', () => {
    expect(convictionForOffenseType('SEX_OFFENSE')).toBe('registry_related');
  });

  it('defaults unknown or empty values to other', () => {
    expect(convictionForOffenseType(null)).toBe('other');
    expect(convictionForOffenseType('')).toBe('other');
    expect(convictionForOffenseType('NONSENSE')).toBe('other');
  });
});
