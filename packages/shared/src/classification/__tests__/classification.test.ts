import {
  classifyJob, classifyApprenticeship, classifyEligibility, classifyIndustry,
  normalizeLocation, formatLocation, auditJob, isApprenticeshipType,
} from '../index';

const base = { company: 'Acme', industryHint: null, apprenticeshipSource: null };
const longDesc = (s: string) => s + ' '.repeat(0) + 'x'.repeat(150);

describe('apprenticeship classifier (strict)', () => {
  it('never labels a senior product-management role an apprenticeship', () => {
    const r = classifyApprenticeship({
      ...base,
      title: 'Senior Product Manager',
      description: longDesc('Lead the roadmap. You will mentor apprentices and junior staff.'),
    });
    expect(r.value).toBe('none');
    expect(isApprenticeshipType(r.value)).toBe(false);
  });

  it('does not classify on a description-only keyword', () => {
    const r = classifyApprenticeship({
      ...base,
      title: 'Marketing Coordinator',
      description: longDesc('Our company runs an apprenticeship program for other teams.'),
    });
    expect(r.value).toBe('none');
  });

  it('recognizes a real trade apprentice title', () => {
    const r = classifyApprenticeship({
      ...base,
      title: 'Electrician Apprentice',
      description: longDesc('Assist licensed electricians on commercial wiring jobs.'),
    });
    expect(r.value).toBe('registered');
  });

  it('honors a source apprenticeship flag as verified', () => {
    const r = classifyApprenticeship({ ...base, apprenticeshipSource: true, title: 'Helper', description: longDesc('trade work') });
    expect(r.value).toBe('registered');
    expect(r.confidence).toBe('verified');
  });

  it('flags pre-apprenticeship distinctly', () => {
    const r = classifyApprenticeship({ ...base, title: 'Construction Pre-Apprenticeship', description: longDesc('pre-apprenticeship readiness program') });
    expect(r.value).toBe('pre_apprenticeship');
  });
});

describe('eligibility / fair-chance (verified evidence only)', () => {
  it('never calls a clearance role fair-chance', () => {
    const r = classifyEligibility({
      ...base, title: 'Systems Analyst',
      description: longDesc('Active Secret clearance required. TS/SCI a plus.'),
    }, 'it_general');
    expect(r.fairChance.value).toBe(false);
    expect(r.fairChance.confidence).toBe('verified');
    expect(r.excludesFelons.value).toBe(true);
  });

  it('clearance wins even when fair-chance boilerplate is present', () => {
    const r = classifyEligibility({
      ...base, title: 'Analyst',
      description: longDesc('We are a fair-chance employer. Security clearance required.'),
    }, null);
    expect(r.fairChance.value).toBe(false);
  });

  it('marks confirmed fair-chance only with explicit language', () => {
    const r = classifyEligibility({
      ...base, title: 'Warehouse Associate',
      description: longDesc('We are a second-chance employer and welcome applicants with records.'),
    }, 'warehousing');
    expect(r.fairChance.value).toBe(true);
    expect(r.fairChance.confidence).toBe('verified');
  });

  it('distinguishes "no barrier detected" from "confirmed fair-chance"', () => {
    const r = classifyEligibility({ ...base, title: 'Forklift Operator', description: longDesc('warehouse role') }, 'warehousing');
    expect(r.excludesFelons.value).toBe(false);     // no barrier detected
    expect(r.fairChance.value).toBe(false);          // but NOT confirmed fair-chance
    expect(r.fairChance.confidence).toBe('uncertain');
  });
});

describe('industry confidence', () => {
  it('is verified from a recognized source category', () => {
    expect(classifyIndustry({ ...base, title: 'x', description: 'y', industryHint: 'warehousing' }))
      .toMatchObject({ value: 'warehousing', confidence: 'verified' });
  });
  it('is uncertain when nothing matches', () => {
    expect(classifyIndustry({ ...base, title: 'Underwater Basket Weaver', description: 'misc' }).confidence).toBe('uncertain');
  });
});

describe('location normalization', () => {
  it('drops a state baked into the city and abbreviates the region', () => {
    expect(normalizeLocation('Iowa City, Iowa', 'Iowa')).toEqual({ city: 'Iowa City', region: 'IA' });
  });
  it('formatLocation dedupes repeated tokens', () => {
    expect(formatLocation({ city: 'Iowa City', region: 'Iowa', postal: 'Iowa' })).toBe('Iowa City, Iowa');
  });
  it('keeps a clean pair intact', () => {
    expect(normalizeLocation('Seattle', 'WA')).toEqual({ city: 'Seattle', region: 'WA' });
  });
});

describe('overconfidence guard', () => {
  it('downgrades inferred labels on a too-sparse posting', () => {
    const meta = classifyJob({ ...base, title: 'Welder', description: 'weld' });
    expect(meta.dataComplete).toBe(false);
    expect(meta.industry.confidence).toBe('uncertain');
  });
});

describe('QA audit', () => {
  it('flags an apprenticeship label on a senior role', () => {
    const issues = auditJob({
      id: '1', title: 'Director of Operations', company: 'Acme',
      classification: classifyJob({ ...base, title: 'Director of Operations', description: longDesc('apprenticeship') }),
    });
    // Director title forces apprenticeship=none, so no false apprenticeship; but
    // an explicitly forced bad meta should be caught:
    const bad = auditJob({
      id: '2', title: 'VP Engineering', company: 'Acme',
      classification: { ...classifyJob({ ...base, title: 'Electrician Apprentice', description: longDesc('trade') }) },
    });
    expect(bad.some((i) => i.code === 'apprenticeship_on_senior_role')).toBe(true);
    expect(Array.isArray(issues)).toBe(true);
  });

  it('flags a duplicated/unnormalized location', () => {
    const issues = auditJob({ id: '3', title: 'Cook', company: 'Acme', locationCity: 'Iowa City, Iowa', locationRegion: 'Iowa' });
    expect(issues.some((i) => i.code === 'location_region_unnormalized' || i.code === 'location_duplicate')).toBe(true);
  });
});
