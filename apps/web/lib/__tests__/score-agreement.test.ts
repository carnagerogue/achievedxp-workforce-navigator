/**
 * Locks the server match pipeline (matchesFor) to the client scorer
 * (scoreJobUnified). Both must go through the same math — a job may never
 * show one score on the dashboard and a different one on /jobs. If this
 * fails, someone reintroduced a second blend.
 */
import { describe, expect, it } from '@jest/globals';
import type { JobDto } from '@dxp/shared';
import { scoreJobUnified, jobScoreContext, type ScoreInputs } from '../job-scoring';
import { matchesFor } from '../server-data';
import { saveProfile, candidateProfilesFromStored, convictionTypesFor, type StoredProfile } from '../profile-store';

const job = (overrides: Partial<JobDto>): JobDto => ({
  id: 'j',
  title: 'General Laborer',
  company: 'Acme Co',
  description: 'General labor duties. No experience required.',
  descriptionHtml: null,
  applyUrl: 'https://example.com/apply',
  locationCity: 'Columbus',
  locationRegion: 'OH',
  locationPostalCode: '43215',
  locationCountry: 'US',
  remote: false,
  employmentType: 'FULL_TIME',
  industry: 'construction',
  salaryMin: 38000,
  salaryMax: 52000,
  salaryCurrency: 'USD',
  requiredSkills: ['general_labor'],
  requiredCertifications: [],
  minYearsExperience: 0,
  riskTier: 'LOW',
  backgroundCheckLikely: false,
  excludesFelons: false,
  isApprenticeship: false,
  postedAt: new Date('2026-01-05').toISOString(),
  expiresAt: null,
  ...overrides,
});

const POOL: JobDto[] = [
  job({ id: 'laborer' }),
  job({ id: 'bank-teller', title: 'Bank Teller', industry: 'finance', description: 'Handle cash and customer accounts.', riskTier: 'HIGH', backgroundCheckLikely: true }),
  job({ id: 'clean-record', title: 'Warehouse Associate', industry: 'warehousing', excludesFelons: true, description: 'Clean background required.' }),
  job({ id: 'federal', title: 'Custodial Worker', company: 'U.S. Army', description: 'On-base custodial role.', riskTier: 'HIGH' }),
  job({ id: 'pharmacy', title: 'Pharmacy Technician', industry: 'healthcare', description: 'Dispense controlled medications.', riskTier: 'HIGH', backgroundCheckLikely: true }),
];

const PROFILE: StoredProfile = {
  userId: 'test-user',
  locationCity: 'Columbus',
  locationRegion: 'OH',
  locationPostalCode: '43215',
  yearsExperience: 2,
  hasTransportation: true,
  skills: ['general_labor'],
  certifications: [],
  desiredIndustries: ['construction', 'warehousing'],
  convictions: [{ category: 'FELONY', offenseType: 'DRUG_DISTRIBUTION', convictionYear: 2019, releaseYear: 2022 }],
};

function inputsFor(profile: StoredProfile | null): ScoreInputs {
  return {
    candidates: candidateProfilesFromStored(profile),
    profile,
    convictionTypes: convictionTypesFor(profile),
    hasConvictions: (profile?.convictions?.length ?? 0) > 0,
  };
}

describe('server/client score agreement', () => {
  it('matchesFor buckets and scores match scoreJobUnified exactly', () => {
    saveProfile(PROFILE);
    const inputs = inputsFor(PROFILE);
    const res = matchesFor(PROFILE.userId, POOL.length, POOL);

    const unified = new Map(POOL.map((j) => [j.id, scoreJobUnified(inputs, j)]));

    for (const m of res.topMatches) {
      expect(unified.get(m.jobId)!.chance).toBe('high');
      expect(m.score).toBe(unified.get(m.jobId)!.score);
    }
    for (const m of res.mediumMatches) {
      expect(unified.get(m.jobId)!.chance).toBe('medium');
      expect(m.score).toBe(unified.get(m.jobId)!.score);
    }
    for (const m of res.avoid) {
      expect(unified.get(m.jobId)!.chance).toBe('low');
      expect(m.score).toBe(unified.get(m.jobId)!.score);
    }
    // Every job lands in exactly one bucket.
    const seen = [...res.topMatches, ...res.mediumMatches, ...res.avoid].map((m) => m.jobId);
    expect(new Set(seen).size).toBe(POOL.length);
  });

  it('categorical barriers land in avoid with a reason, for a person with a record', () => {
    saveProfile(PROFILE);
    const res = matchesFor(PROFILE.userId, POOL.length, POOL);
    const avoidIds = new Set(res.avoid.map((m) => m.jobId));
    expect(avoidIds.has('clean-record')).toBe(true);
    expect(avoidIds.has('federal')).toBe(true);
    for (const m of res.avoid) expect(m.reasons.length).toBeGreaterThan(0);
  });

  it('precomputed context path scores identically (insights fast path)', () => {
    const inputs = inputsFor(PROFILE);
    for (const j of POOL) {
      const direct = scoreJobUnified(inputs, j);
      const viaCtx = scoreJobUnified(inputs, j, jobScoreContext(inputs, j));
      expect(viaCtx).toEqual(direct);
    }
  });
});
