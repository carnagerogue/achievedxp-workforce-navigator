import { describe, expect, it } from '@jest/globals';
import type { JobDto } from '@dxp/shared';
import { filterJobs, matchesFor } from '../server-data';
import type { ScoreInputs } from '../job-scoring';
import { saveProfile } from '../profile-store';

function makeJob(id: string, overrides: Partial<JobDto> = {}): JobDto {
  return {
    id,
    title: 'Senior Software Architect',
    company: 'Example Co',
    description: 'Lead a complex software platform.',
    descriptionHtml: null,
    applyUrl: `https://example.com/${id}`,
    locationCity: 'Seattle',
    locationRegion: 'WA',
    locationPostalCode: '98101',
    locationCountry: 'US',
    remote: false,
    employmentType: 'FULL_TIME',
    industry: 'it_general',
    salaryMin: 90000,
    salaryMax: 120000,
    salaryCurrency: 'USD',
    requiredSkills: ['software_architecture'],
    requiredCertifications: [],
    minYearsExperience: 8,
    riskTier: 'LOW',
    backgroundCheckLikely: false,
    excludesFelons: false,
    isApprenticeship: false,
    postedAt: new Date('2026-08-01').toISOString(),
    expiresAt: null,
    sourceCode: 'test',
    sourceName: 'Test',
    ...overrides,
  };
}

describe('job search ordering and distance', () => {
  it('puts generally attainable roles ahead of executive roles before a profile exists', () => {
    const result = filterJobs({}, [
      makeJob('executive', { title: 'Vice President of Engineering', minYearsExperience: 12 }),
      makeJob('entry', { title: 'Warehouse Trainee', industry: 'warehousing', minYearsExperience: 0, requiredSkills: [] }),
    ]);
    expect(result.results[0].id).toBe('entry');
  });

  it('ranks the entire result pool before slicing page one', () => {
    const source = Array.from({ length: 60 }, (_, i) => makeJob(`hard-${i}`));
    source.push(makeJob('best', {
      title: 'Warehouse Associate',
      description: 'Entry-level order picking and packing. Training provided.',
      industry: 'warehousing',
      requiredSkills: ['warehouse_operations'],
      minYearsExperience: 0,
    }));
    const inputs: ScoreInputs = {
      candidates: [{ desiredIndustries: ['warehousing'] }],
      profile: { userId: 'u1', yearsExperience: 1, skills: ['warehouse_operations'], desiredIndustries: ['warehousing'] },
      convictionTypes: [],
      hasConvictions: false,
    };

    const result = filterJobs({ limit: 10 }, source, inputs);
    expect(result.results[0].id).toBe('best');
    expect(result.total).toBe(61);
  });

  it('uses real ZIP distance and honors the requested radius', () => {
    const source = [
      makeJob('seattle', { locationCity: 'Seattle', locationPostalCode: '98101' }),
      makeJob('tacoma', { locationCity: 'Tacoma', locationPostalCode: '98402' }),
      makeJob('spokane', { locationCity: 'Spokane', locationPostalCode: '99201' }),
    ];
    const near = filterJobs({ postalCode: '98101', radiusMiles: 40 }, source);
    const tight = filterJobs({ postalCode: '98101', radiusMiles: 10 }, source);
    expect(near.results.map((job) => job.id)).toEqual(expect.arrayContaining(['seattle', 'tacoma']));
    expect(near.results.map((job) => job.id)).not.toContain('spokane');
    expect(tight.results.map((job) => job.id)).toEqual(['seattle']);
  });

  it('can exclude every remote job without affecting in-person results', () => {
    const source = [
      makeJob('local'),
      makeJob('remote', { remote: true, locationCity: null, locationRegion: null, locationPostalCode: null }),
      makeJob('mislabeled-remote', { remote: false, locationCity: 'Remote', locationRegion: null, locationPostalCode: null }),
    ];

    expect(filterJobs({ includeRemote: true }, source).results.map((job) => job.id)).toEqual(
      expect.arrayContaining(['local', 'remote', 'mislabeled-remote']),
    );
    expect(filterJobs({ includeRemote: false }, source).results.map((job) => job.id)).toEqual(['local']);
  });

  it('includes remote jobs alongside geographically matching in-person jobs when enabled', () => {
    const source = [
      makeJob('seattle'),
      makeJob('portland', { locationCity: 'Portland', locationRegion: 'OR', locationPostalCode: '97205' }),
      makeJob('remote', { remote: true, locationCity: null, locationRegion: null, locationPostalCode: null }),
    ];

    const included = filterJobs({ region: 'WA', includeRemote: true }, source);
    const excluded = filterJobs({ region: 'WA', includeRemote: false }, source);
    expect(included.results.map((job) => job.id)).toEqual(expect.arrayContaining(['seattle', 'remote']));
    expect(included.results.map((job) => job.id)).not.toContain('portland');
    expect(excluded.results.map((job) => job.id)).toEqual(['seattle']);
  });

  it('honors the saved remote preference in personalized matches', async () => {
    const userId = 'remote-pref-off';
    saveProfile({ userId, includeRemoteJobs: false });
    const source = [
      makeJob('local', { title: 'Warehouse Associate', minYearsExperience: 0 }),
      makeJob('remote', { remote: true, title: 'Remote Support Associate', minYearsExperience: 0 }),
    ];

    const matches = await matchesFor(userId, 10, source);
    expect(matches.counts.pool).toBe(1);
    expect([
      ...matches.topMatches,
      ...matches.mediumMatches,
      ...matches.avoid,
    ].map((match) => match.jobId)).toEqual(['local']);
  });
});
