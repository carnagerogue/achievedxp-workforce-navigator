import { describe, expect, it } from '@jest/globals';
import { buildAssessmentResult } from '../server-data';
import { inferSeniority } from '../realistic-fit';
import { isFreshJob } from '../providers/types';
import { assessReadiness, selfToReadinessInput } from '../readiness';
import { hasStaffRole } from '../auth-config';
import { dashboardState } from '../dashboard-state';

const answersAt = (value: number) => Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, value]));

describe('QA trust regressions', () => {
  it('keeps assessment dimension scores on the documented 25-point scale', () => {
    const low = buildAssessmentResult('u', answersAt(1));
    const high = buildAssessmentResult('u', answersAt(5));
    expect(Object.values(low.scores)).toEqual([5, 5, 5, 5, 5, 5]);
    expect(Object.values(high.scores)).toEqual([25, 25, 25, 25, 25, 25]);
  });

  it('describes equal assessment answers as broad instead of forcing RIA', () => {
    const result = buildAssessmentResult('u', answersAt(4));
    expect(result.isBroadProfile).toBe(true);
    expect(result.hollandCode).toBe('BROAD');
    expect(result.topDimensions).toHaveLength(6);
  });

  it('builds career job queries without a leading question mark', () => {
    const result = buildAssessmentResult('u', answersAt(5));
    for (const occupation of result.occupations) {
      expect(occupation.jobsQuery).toMatch(/^industry=/);
      expect(`/jobs?${occupation.jobsQuery}`).not.toContain('??');
    }
  });

  it('does not treat company age as required role experience', () => {
    const result = inferSeniority('Exterior Services Technician', 'A family company serving customers for 18 years. Training provided.');
    expect(result.level).not.toBe('executive');
    expect(result.years).toBeLessThanOrEqual(3);
  });

  it('still recognizes explicit experience requirements', () => {
    expect(inferSeniority('Technician', 'Minimum 5 years of relevant experience required.').years).toBe(5);
  });

  it('rejects invalid, expired, future, and stale live posting dates', () => {
    const now = Date.UTC(2026, 7, 7);
    expect(isFreshJob({ postedAt: 'not-a-date', expiresAt: null }, now)).toBe(false);
    expect(isFreshJob({ postedAt: '2025-01-01', expiresAt: null }, now)).toBe(false);
    expect(isFreshJob({ postedAt: '2026-08-20', expiresAt: null }, now)).toBe(false);
    expect(isFreshJob({ postedAt: '2026-08-01', expiresAt: '2026-08-06' }, now)).toBe(false);
    expect(isFreshJob({ postedAt: '2026-08-01', expiresAt: '2026-09-01' }, now)).toBe(true);
  });

  it('starts readiness unassessed rather than inventing a 51 score', () => {
    const result = assessReadiness(selfToReadinessInput({}));
    expect(result.score).toBe(0);
    expect(result.domains.every((domain) => domain.status === 'na')).toBe(true);
  });

  it('recognizes only explicit staff roles', () => {
    expect(hasStaffRole({ role: 'caseworker' })).toBe(true);
    expect(hasStaffRole({ metadata: { role: 'admin' } })).toBe(true);
    expect(hasStaffRole({ role: 'participant' })).toBe(false);
    expect(hasStaffRole({})).toBe(false);
  });

  it('does not show personalized dashboard content before onboarding', () => {
    expect(dashboardState(false, false, false)).toBe('loading');
    expect(dashboardState(true, false, false)).toBe('loading');
    expect(dashboardState(true, true, false)).toBe('onboarding');
    expect(dashboardState(true, true, true)).toBe('ready');
  });
});
