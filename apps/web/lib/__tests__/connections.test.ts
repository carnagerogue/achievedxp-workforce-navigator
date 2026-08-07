/**
 * @jest-environment jsdom
 *
 * Locks the Connections store's core promises: connecting/disconnecting is a
 * per-user, local-only link (never a password vault), the registry stays honest
 * about capabilities, and connection state is isolated per scope like every
 * other personal store.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { setScope } from '../scoped-storage';
import {
  PROVIDERS, getProvider, isOAuthEnabled,
  connect, disconnect, isConnected, connectedCount, getConnections,
} from '../connections';

beforeEach(() => {
  window.localStorage.clear();
  setScope('userReset');
  setScope('guest');
});

describe('connections registry', () => {
  it('every provider declares an honest does/doesNot and a real url', () => {
    for (const p of PROVIDERS) {
      expect(p.does.length).toBeGreaterThan(0);
      expect(p.doesNot.length).toBeGreaterThan(0);
      expect(p.url).toMatch(/^https:\/\//);
    }
  });

  it('job-board providers are handoffs that never claim to apply for you', () => {
    const boards = PROVIDERS.filter((p) => p.category === 'jobBoard');
    expect(boards.length).toBeGreaterThan(0);
    for (const p of boards) {
      expect(p.method).toBe('handoff');
      // A handoff must not import a profile (that would imply account access).
      expect(p.caps.importsProfile).toBe(false);
    }
  });

  it('identity oauth is gracefully off without a configured account provider', () => {
    // No NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in the test env ⇒ oauth is off,
    // handoffs are always available.
    const google = getProvider('google')!;
    const indeed = getProvider('indeed')!;
    expect(isOAuthEnabled(google)).toBe(false);
    expect(isOAuthEnabled(indeed)).toBe(true);
  });
});

describe('connection state', () => {
  it('connect then disconnect toggles membership', () => {
    expect(isConnected('indeed')).toBe(false);
    connect('indeed', { handle: 'me@example.com', connectedAt: 123 });
    expect(isConnected('indeed')).toBe(true);
    expect(getConnections().indeed.handle).toBe('me@example.com');
    expect(connectedCount()).toBe(1);

    disconnect('indeed');
    expect(isConnected('indeed')).toBe(false);
    expect(connectedCount()).toBe(0);
  });

  it('ignores unknown providers', () => {
    connect('not-a-real-provider', { connectedAt: 1 });
    expect(connectedCount()).toBe(0);
  });

  it('is isolated per user scope', () => {
    setScope('userA');
    connect('indeed', { connectedAt: 1 });
    expect(isConnected('indeed')).toBe(true);

    setScope('userB');
    expect(isConnected('indeed')).toBe(false); // B cannot see A's connections

    setScope('userA');
    expect(isConnected('indeed')).toBe(true); // restored on return
  });
});
