import { describe, expect, it } from '@jest/globals';
import type { JobDto } from '@dxp/shared';
import { filterJobs } from '../server-data';
import type { ScoreInputs } from '../job-scoring';

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
});
