/**
 * @jest-environment jsdom
 *
 * Locks the per-user data-isolation guarantee: two scopes on one browser never
 * see each other's data, and signing out (guest) hides the signed-in user's
 * data. If this breaks, personal data could leak between people on a shared
 * device — the exact failure this scoping exists to prevent.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { setScope, lsGet, lsSet } from '../scoped-storage';
import { setReentryInputs, getReentryInputs } from '../reentry-store';

beforeEach(() => {
  window.localStorage.clear();
  setScope('userReset');
  setScope('guest');
});

describe('per-user data isolation', () => {
  it('keeps each scope’s keys separate', () => {
    setScope('userA');
    lsSet('probe', 'A-value');
    expect(lsGet('probe')).toBe('A-value');

    setScope('userB');
    expect(lsGet('probe')).toBeNull(); // B cannot see A's data

    lsSet('probe', 'B-value');
    setScope('userA');
    expect(lsGet('probe')).toBe('A-value'); // A's data is intact and unchanged
  });

  it('a store re-reads its namespace when the user switches', () => {
    setScope('userA');
    setReentryInputs({ onSupervision: true });
    expect(getReentryInputs().onSupervision).toBe(true);

    setScope('userB');
    expect(getReentryInputs().onSupervision).toBeUndefined(); // isolated from A

    setScope('userA');
    expect(getReentryInputs().onSupervision).toBe(true); // restored on return
  });

  it('signing out hides the signed-in user’s data', () => {
    setScope('userA');
    setReentryInputs({ hasDependents: true });
    expect(getReentryInputs().hasDependents).toBe(true);

    setScope('guest'); // sign out
    expect(getReentryInputs().hasDependents).toBeUndefined();
  });

  it('writes under different scopes land in distinct localStorage keys', () => {
    setScope('userA');
    lsSet('thing', '1');
    setScope('userB');
    lsSet('thing', '2');
    const keys = Object.keys(window.localStorage);
    expect(keys).toContain('dxp:userA:thing');
    expect(keys).toContain('dxp:userB:thing');
  });
});
