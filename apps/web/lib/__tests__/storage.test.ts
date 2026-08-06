/**
 * KV-document storage layer — memory backend.
 *
 * The Postgres backend is intentionally NOT covered here: no database exists
 * in this environment (DATABASE_URL is unset, so getDoc/putDoc exercise the
 * memory path — which is also exactly the deployed no-DATABASE_URL behavior,
 * and the path every Postgres error degrades to).
 */
import { describe, expect, it } from '@jest/globals';
import { getDoc, putDoc } from '../storage';
import { memPutDoc } from '../storage/memory';

describe('storage layer (memory backend)', () => {
  it('round-trips a document through put/get', async () => {
    const doc = { userId: 'u1', skills: ['welding', 'carpentry'], nested: { years: 3 } };
    await putDoc('storage-test-roundtrip', 'u1', doc);
    await expect(getDoc('storage-test-roundtrip', 'u1')).resolves.toEqual(doc);
  });

  it('returns null for a missing document', async () => {
    await expect(getDoc('storage-test-missing', 'nobody')).resolves.toBeNull();
  });

  it('isolates documents by collection', async () => {
    await putDoc('storage-test-iso-a', 'same-id', { from: 'a' });
    await putDoc('storage-test-iso-b', 'same-id', { from: 'b' });
    await expect(getDoc('storage-test-iso-a', 'same-id')).resolves.toEqual({ from: 'a' });
    await expect(getDoc('storage-test-iso-b', 'same-id')).resolves.toEqual({ from: 'b' });
    // A third collection never written to stays empty even for a known id.
    await expect(getDoc('storage-test-iso-c', 'same-id')).resolves.toBeNull();
  });

  it('overwrites on repeated put of the same key', async () => {
    await putDoc('storage-test-overwrite', 'k', { v: 1 });
    await putDoc('storage-test-overwrite', 'k', { v: 2 });
    await expect(getDoc('storage-test-overwrite', 'k')).resolves.toEqual({ v: 2 });
  });

  it('makes synchronous memory writes visible to the async API', async () => {
    // profile-store.saveProfile depends on this contract: it writes the
    // memory backend synchronously and matchesFor immediately reads through
    // getDoc, which must check memory first.
    memPutDoc('storage-test-sync', 'id', { sync: true });
    await expect(getDoc('storage-test-sync', 'id')).resolves.toEqual({ sync: true });
  });
});
