import { describe, expect, it } from '@jest/globals';
import { scoreJobCompatibility } from '../scoring';

describe('compatibility copy without conviction context', () => {
  it('does not recommend expungement or claim a selected conviction', () => {
    const result = scoreJobCompatibility({}, {
      id: 'job',
      title: 'Warehouse Associate',
      company: 'Example Co',
      description: 'Entry-level warehouse role. Training provided.',
      industry: 'warehousing',
      riskTier: 'LOW',
      excludesFelons: false,
      backgroundCheckLikely: false,
      isApprenticeship: false,
      remote: false,
      locationRegion: 'WA',
    });
    expect(result.chanceImprovers.join(' ')).not.toMatch(/expung|record sealing|post-release/i);
    expect(result.recommendedNextStep).not.toMatch(/selected conviction|background policy/i);
  });
});
