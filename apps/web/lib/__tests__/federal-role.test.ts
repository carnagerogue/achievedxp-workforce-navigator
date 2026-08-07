import { describe, expect, it } from '@jest/globals';
import { isExclusionaryEmployer } from '../job-scoring';

describe('federal role handling', () => {
  it('does not exclude an ordinary civilian role because the employer is federal', () => {
    expect(isExclusionaryEmployer({ company: 'U.S. Department of Labor', title: 'Program Support Assistant', description: 'Administrative support.' })).toBe(false);
    expect(isExclusionaryEmployer({ company: 'Department of the Army', title: 'Warehouse Worker', description: 'Receive and stage supplies.' })).toBe(false);
  });

  it('still flags explicit clearance and security-sensitive duties', () => {
    expect(isExclusionaryEmployer({ company: 'Example Contractor', title: 'Systems Analyst', description: 'Active top secret clearance required.' })).toBe(true);
    expect(isExclusionaryEmployer({ company: 'City', title: 'Correctional Officer', description: '' })).toBe(true);
  });
});
