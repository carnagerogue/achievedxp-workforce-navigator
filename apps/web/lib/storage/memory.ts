/**
 * In-process memory backend for the KV-document storage layer (lib/storage).
 *
 * A Map of Maps (collection → id → doc) pinned to globalThis so it is a true
 * singleton across every API route handler — Next bundles route handlers
 * separately (especially in dev), so a plain module-level `const` can yield a
 * different Map per route. Same pattern the old profile-store used.
 *
 * This module MUST stay client-safe (no Node-only APIs, no `pg`): the client
 * pages import profile-store for its pure helpers, and profile-store uses the
 * sync accessors here so its synchronous getProfile/saveProfile signatures
 * keep working. Anything Postgres-related lives in ./postgres and is only
 * reachable through the server-only async API in ./index.
 */

const globalForKv = globalThis as unknown as {
  __dxpKvMemory?: Map<string, Map<string, unknown>>;
};
const MEMORY: Map<string, Map<string, unknown>> = globalForKv.__dxpKvMemory ?? new Map();
globalForKv.__dxpKvMemory = MEMORY;

function collectionMap(collection: string): Map<string, unknown> {
  let docs = MEMORY.get(collection);
  if (!docs) {
    docs = new Map();
    MEMORY.set(collection, docs);
  }
  return docs;
}

/** Synchronous memory read. Returns null when the doc isn't in memory. */
export function memGetDoc<T>(collection: string, id: string): T | null {
  const docs = MEMORY.get(collection);
  if (!docs || !docs.has(id)) return null;
  return docs.get(id) as T;
}

/**
 * Synchronous memory write. Also serves as the write-through / read-through
 * cache when the Postgres backend is active (see ./index).
 */
export function memPutDoc<T>(collection: string, id: string, doc: T): void {
  collectionMap(collection).set(id, doc);
}
