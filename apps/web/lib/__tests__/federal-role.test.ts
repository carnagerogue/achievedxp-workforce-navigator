import { describe, expect, it } from '@jest/globals';
import { isExclusionaryEmployer } from '../job-scoring';

describe('federal role handling', () => {
  it('does not exclude an ordinary civilian role because the employer is federal', () => {
    expect(isExclusionaryEmployer({ company: 'U.S. Department of Labor', title: 'Program Support Assistant', description: 'Administrative support.' })).toBe(false);
    expect(isExclusionaryEmployer({ company: 'Department of the Army', title: 'Warehouse Worker', description: 'Receive and stage supplies.' })).toBe(false);
  });

  it('does not mislabel suitability or clearance review as a blanket exclusion', () => {
    expect(isExclusionaryEmployer({ company: 'Example Contractor', title: 'Systems Analyst', description: 'Active top secret clearance required.' })).toBe(false);
    expect(isExclusionaryEmployer({ company: 'City', title: 'Correctional Officer', description: '' })).toBe(false);
  });

  it('does identify explicit employer blanket-exclusion language', () => {
    expect(isExclusionaryEmployer({ company: 'Example', title: 'Worker', description: 'No felony convictions allowed.' })).toBe(true);
    expect(isExclusionaryEmployer({ company: 'Example', title: 'Worker', description: 'Clean criminal record required.' })).toBe(true);
  });
});
