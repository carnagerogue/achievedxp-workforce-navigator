import { decisionFor } from '../index';
import { classifyJob } from '../../classification';
import type { JobDto } from '../../index';

const longDesc = (s: string) => s + ' '.repeat(0) + 'x'.repeat(150);

function makeJob(over: Partial<JobDto> & { title: string; description: string; company?: string }): JobDto {
  const { title, description, company = 'Acme', classification: cOver, industry: iOver, ...rest } = over;
  const classification = cOver ?? classifyJob({ title, description, company, industryHint: iOver ?? null });
  return {
    id: 'j1', title, company, description, descriptionHtml: null,
    applyUrl: 'https://x', locationCity: 'Seattle', locationRegion: 'WA', locationPostalCode: null,
    locationCountry: 'US', remote: false, employmentType: 'FULL_TIME',
    industry: iOver ?? classification.industry.value, salaryMin: null, salaryMax: null, salaryCurrency: null,
    requiredSkills: [], requiredCertifications: [], minYearsExperience: null,
    riskTier: classification.riskTier.value, backgroundCheckLikely: classification.backgroundCheckLikely.value,
    excludesFelons: classification.excludesFelons.value, isApprenticeship: false,
    postedAt: null, expiresAt: null, classification, ...rest,
  } as JobDto;
}

describe('decisionFor', () => {
  it('explains the recommendation without any score', () => {
    const d = decisionFor(makeJob({ title: 'Warehouse Associate', description: longDesc('Pick and pack orders in our distribution center. We are a second-chance employer and welcome applicants with records.'), industry: 'warehousing' }));
    expect(d.band).toBe('good_next_step');
    expect(d.reason).toMatch(/fair-chance/i);
    expect(d.reason).not.toMatch(/\d+%/);          // no bare score
    expect(d.evidence.length).toBeGreaterThan(0);   // visible supporting evidence
  });

  it('marks a clearance role a likely barrier and never fair-chance', () => {
    const d = decisionFor(makeJob({ title: 'Systems Analyst', description: longDesc('Active Secret security clearance required.') }));
    expect(d.band).toBe('likely_barrier');
    expect(d.evidence.find((e) => e.label === 'Fair-chance hiring')!.value).toBe('not stated');
  });

  it('distinguishes "no barrier detected" from "confirmed fair-chance"', () => {
    const noBarrier = decisionFor(makeJob({ title: 'Forklift Operator', description: longDesc('Operate a forklift in a warehouse. Move pallets and load trucks all shift.'), industry: 'warehousing' }));
    const confirmed = decisionFor(makeJob({ title: 'Forklift Operator', description: longDesc('Operate a forklift. We are a fair-chance employer and consider applicants with records.'), industry: 'warehousing' }));
    // no-barrier: fair-chance is uncertain (not confirmed)
    expect(noBarrier.evidence.find((e) => e.label === 'Fair-chance hiring')!.status).toBe('uncertain');
    // confirmed: fair-chance verified
    expect(confirmed.evidence.find((e) => e.label === 'Fair-chance hiring')!.status).toBe('verified');
    expect(confirmed.reason).not.toEqual(noBarrier.reason);
  });

  it('honors a hard legal block from conviction context', () => {
    const d = decisionFor(makeJob({ title: 'School Custodian', description: longDesc('Clean and maintain school facilities.') }), { hardBlocked: true, hardBlockReason: 'Registry restrictions bar work at a school.', convictionSelected: true });
    expect(d.band).toBe('likely_barrier');
    expect(d.reason).toMatch(/registry/i);
  });

  it('always carries a guidance disclaimer and a next action', () => {
    const d = decisionFor(makeJob({ title: 'Cook', description: longDesc('Prep food in a busy kitchen.') }));
    expect(d.disclaimer).toMatch(/not an employer decision/i);
    expect(d.nextAction.length).toBeGreaterThan(0);
  });
});
