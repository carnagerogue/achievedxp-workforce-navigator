import { describe, expect, it } from '@jest/globals';
import { buildAssessmentResult } from '../server-data';
import { inferSeniority } from '../realistic-fit';
import { isFreshJob } from '../providers/types';
import { assessReadiness, selfToReadinessInput } from '../readiness';
import { hasStaffRole } from '../auth-config';
import { dashboardState } from '../dashboard-state';
import { applicableSteps, inCriticalWindow, nextStep, PHASES } from '../reentry-journey';
import { accountDisplayName, accountImageUrl } from '../account-identity';

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

  it('starts every user with universal career guidance, not identity-document or record assumptions', () => {
    const visible = PHASES.flatMap((phase) => applicableSteps(phase, {}));
    expect(nextStep({}, new Set())?.step.id).toBe('career-fit');
    expect(visible.map((step) => step.id)).not.toContain('id');
    expect(visible.map((step) => step.id)).not.toContain('supervision');
    expect(visible.map((step) => step.id)).not.toContain('employer-case');
  });

  it('shows specialized support only after the user asks for it', () => {
    const firstPhase = PHASES[0];
    expect(applicableSteps(firstPhase, { needsId: true }).map((step) => step.id)).toContain('id');
    expect(applicableSteps(firstPhase, { onSupervision: true }).map((step) => step.id)).not.toContain('supervision');
    expect(applicableSteps(firstPhase, { justiceSupport: true, onSupervision: true }).map((step) => step.id)).toContain('supervision');
    expect(inCriticalWindow({ daysSinceRelease: 30 })).toBe(false);
    expect(inCriticalWindow({ justiceSupport: true, daysSinceRelease: 30 })).toBe(true);
  });

  it('prefers the signed-in provider profile image over Clerk fallback artwork', () => {
    const user = {
      fullName: 'Christopher Aro',
      hasImage: false,
      imageUrl: 'https://clerk.example/fallback.svg',
      externalAccounts: [
        { provider: 'oauth_microsoft', imageUrl: 'https://microsoft.example/christopher.jpg' },
        { provider: 'oauth_google', imageUrl: 'https://google.example/christopher.jpg' },
      ],
    };
    expect(accountDisplayName(user)).toBe('Christopher Aro');
    expect(accountImageUrl(user)).toBe('https://google.example/christopher.jpg');
  });

  it('falls back to initials when neither the account nor provider has a real image', () => {
    expect(accountImageUrl({ hasImage: false, imageUrl: 'https://clerk.example/fallback.svg' })).toBeUndefined();
  });
});
