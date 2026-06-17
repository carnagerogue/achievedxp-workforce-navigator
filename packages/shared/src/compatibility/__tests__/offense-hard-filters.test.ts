import { describe, it, expect } from '@jest/globals';
import {
  isOffenseHardBlocked,
  convictionForOffenseType,
  OFFENSE_HARD_FILTERS,
} from '../offense-hard-filters';
import { CONVICTION_TYPE_ORDER } from '../types';

describe('offense hard filters', () => {
  it('has exactly one entry per conviction type', () => {
    const keys = Object.keys(OFFENSE_HARD_FILTERS).sort();
    expect(keys).toEqual([...CONVICTION_TYPE_ORDER].sort());
  });

  it('registry-related is barred from school/childcare roles by industry', () => {
    expect(isOffenseHardBlocked('registry_related', { industry: 'education', title: 'Custodian' }).blocked).toBe(true);
  });

  it('registry-related is barred from a school custodian by title even when industry is generic', () => {
    expect(isOffenseHardBlocked('registry_related', { industry: 'cleaning', title: 'School Custodian' }).blocked).toBe(true);
  });

  it('registry-related is NOT barred from a warehouse role', () => {
    expect(isOffenseHardBlocked('registry_related', { industry: 'warehousing', title: 'Forklift Operator' }).blocked).toBe(false);
  });

  it('financial-fraud is barred from a bank teller', () => {
    expect(isOffenseHardBlocked('financial_fraud', { industry: 'services', title: 'Bank Teller' }).blocked).toBe(true);
  });

  it('weapons-related is barred from armed security', () => {
    expect(isOffenseHardBlocked('weapons_related', { industry: 'security', title: 'Armed Security Guard' }).blocked).toBe(true);
  });

  it('DUI is barred from a CDL driver', () => {
    expect(isOffenseHardBlocked('dui_dwi', { industry: 'transportation', title: 'CDL Truck Driver' }).blocked).toBe(true);
  });

  it('drug-distribution is barred from a pharmacy tech', () => {
    expect(isOffenseHardBlocked('drug_distribution', { industry: 'healthcare', title: 'Pharmacy Technician' }).blocked).toBe(true);
  });

  it('`other` never hard-blocks', () => {
    expect(isOffenseHardBlocked('other', { industry: 'security', title: 'Armed Security Guard' }).blocked).toBe(false);
  });

  it('null/undefined conviction never blocks', () => {
    expect(isOffenseHardBlocked(null, { industry: 'education', title: 'Teacher' }).blocked).toBe(false);
    expect(isOffenseHardBlocked(undefined, { industry: 'education', title: 'Teacher' }).blocked).toBe(false);
  });

  it('is case-insensitive on industry and title', () => {
    expect(isOffenseHardBlocked('financial_fraud', { industry: 'FINANCE', title: 'PAYROLL Clerk' }).blocked).toBe(true);
  });

  it('matches keywords on word boundaries, not substrings', () => {
    // "welder" contains "elder", "minority" contains "minor" — neither should trip.
    expect(isOffenseHardBlocked('registry_related', { industry: 'manufacturing', title: 'Welder — Structural Steel' }).blocked).toBe(false);
    expect(isOffenseHardBlocked('registry_related', { industry: 'services', title: 'Minority Outreach Associate' }).blocked).toBe(false);
    // but a real "Elder Care Aide" still trips.
    expect(isOffenseHardBlocked('registry_related', { industry: 'services', title: 'Elder Care Aide' }).blocked).toBe(true);
  });

  it('returns a non-empty reason when blocked', () => {
    const r = isOffenseHardBlocked('weapons_related', { industry: 'security', title: 'Guard' });
    expect(r.blocked).toBe(true);
    expect(typeof r.reason).toBe('string');
    expect((r.reason ?? '').length).toBeGreaterThan(0);
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

  it('defaults unknown / empty values to other', () => {
    expect(convictionForOffenseType(null)).toBe('other');
    expect(convictionForOffenseType('')).toBe('other');
    expect(convictionForOffenseType('NONSENSE')).toBe('other');
  });
});
