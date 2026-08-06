/**
 * Tiny async KV-document storage layer for the web app's durable server state
 * (user profiles, RIASEC assessment results).
 *
 *   getDoc<T>(collection, id)       → Promise<T | null>
 *   putDoc<T>(collection, id, doc)  → Promise<void>
 *
 * Two backends:
 *
 *  - memory (default, no DATABASE_URL): a globalThis-pinned Map of Maps —
 *    exactly the pre-existing in-process behavior. State lives for the
 *    lifetime of the server instance and resets on redeploy.
 *
 *  - postgres (when process.env.DATABASE_URL is set): one `kv_docs` jsonb
 *    table, created on first use. Memory doubles as the cache: putDoc writes
 *    memory synchronously and then upserts Postgres; getDoc reads memory
 *    first and only hits Postgres on a miss (populating memory on a hit).
 *    Any Postgres failure degrades gracefully to memory-only — a DB outage
 *    never crashes a request (see ./postgres).
 *
 * SERVER-ONLY module: import it from route handlers and server-side lib code
 * only. Client components that need the sync memory behavior go through
 * profile-store, which imports ./memory directly — that split keeps `pg` out
 * of client bundles.
 *
 * Docs are JSON-serializable objects; `null` is not a storable value (it is
 * the miss signal).
 */
import { memGetDoc, memPutDoc } from './memory';
import { pgGetDoc, pgPutDoc, postgresConfigured } from './postgres';

export async function getDoc<T>(collection: string, id: string): Promise<T | null> {
  const cached = memGetDoc<T>(collection, id);
  if (cached !== null) return cached;
  if (!postgresConfigured()) return null;
  const res = await pgGetDoc(collection, id);
  if (res.ok && res.doc != null) {
    memPutDoc(collection, id, res.doc);
    return res.doc as T;
  }
  return null;
}

export async function putDoc<T>(collection: string, id: string, doc: T): Promise<void> {
  // Memory first, synchronously — sync readers (e.g. profile-store.getProfile)
  // see the write immediately, and a DB outage never loses in-session state.
  memPutDoc(collection, id, doc);
  if (!postgresConfigured()) return;
  await pgPutDoc(collection, id, doc);
}
