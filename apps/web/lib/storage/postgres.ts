/**
 * Postgres backend for the KV-document storage layer (lib/storage).
 *
 * SERVER-ONLY. `pg` is loaded lazily via a dynamic `await import('pg')` so it
 * can never leak into a client bundle, and nothing here runs unless
 * process.env.DATABASE_URL is set (on Railway: the Postgres service's
 * DATABASE_URL attached to the web service — see docs/web-persistence.md).
 *
 * One table holds every collection as jsonb documents:
 *
 *   kv_docs (collection text, id text, doc jsonb,
 *            updated_at timestamptz default now(),
 *            primary key (collection, id))
 *
 * created on first use via CREATE TABLE IF NOT EXISTS.
 *
 * Failure model: a database problem must NEVER crash a request. Every error is
 * logged once, then Postgres is skipped for a short cooldown while the memory
 * backend keeps serving — the app degrades to exactly its no-DATABASE_URL
 * behavior until the database recovers.
 */
import type { Pool } from 'pg';

const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS kv_docs (
    collection text NOT NULL,
    id text NOT NULL,
    doc jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (collection, id)
  )
`;

/** After a failure, skip Postgres for this long so an outage doesn't tax every request. */
const RETRY_COOLDOWN_MS = 30_000;

type PgState = {
  /** Lazy singleton pool (created together with the kv_docs table). */
  poolPromise?: Promise<Pool | null>;
  /** First failure already logged? We log once, then degrade quietly. */
  warned?: boolean;
  /** Timestamp until which Postgres is skipped after a failure. */
  failedUntil?: number;
};

// Pinned to globalThis for the same singleton-across-route-handlers reason as
// the memory backend — otherwise dev-mode rebuilds could leak pools.
const globalForPg = globalThis as unknown as { __dxpPgState?: PgState };
const state: PgState = globalForPg.__dxpPgState ?? {};
globalForPg.__dxpPgState = state;

export function postgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function degrade(context: string, err: unknown): void {
  state.failedUntil = Date.now() + RETRY_COOLDOWN_MS;
  if (!state.warned) {
    state.warned = true;
    console.error(
      `[storage] Postgres ${context} failed — serving from in-process memory ` +
        `(retrying every ${RETRY_COOLDOWN_MS / 1000}s):`,
      err,
    );
  }
}

async function connect(): Promise<Pool> {
  // Dynamic import keeps `pg` out of every bundle that doesn't reach this
  // line at runtime (and out of client chunks entirely).
  const { Pool: PgPool } = await import('pg');
  const pool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    // Railway Postgres (internal host and public TCP proxy alike) terminates
    // TLS with a certificate that can't be verified against public CAs, so
    // encrypt without verification. Set PGSSLMODE=disable for servers that
    // don't speak TLS at all (e.g. a plain local docker postgres).
    ssl: process.env.PGSSLMODE === 'disable' ? undefined : { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 5_000,
  });
  // Idle clients can error out of band (server restart, network blip). With
  // no listener that's an unhandled 'error' event — a process crash.
  pool.on('error', (err) => degrade('pool', err));
  await pool.query(TABLE_SQL);
  return pool;
}

async function getPool(): Promise<Pool | null> {
  if (!postgresConfigured()) return null;
  if (state.failedUntil && Date.now() < state.failedUntil) return null;
  if (!state.poolPromise) {
    state.poolPromise = connect().catch((err): null => {
      degrade('connect', err);
      state.poolPromise = undefined; // allow a fresh attempt after the cooldown
      return null;
    });
  }
  return state.poolPromise;
}

/**
 * Read a doc. `ok: false` means "backend unavailable" (caller falls back to
 * memory-only semantics); `ok: true, doc: null` means a genuine miss.
 */
export async function pgGetDoc(
  collection: string,
  id: string,
): Promise<{ ok: boolean; doc: unknown }> {
  const pool = await getPool();
  if (!pool) return { ok: false, doc: null };
  try {
    const res = await pool.query('SELECT doc FROM kv_docs WHERE collection = $1 AND id = $2', [
      collection,
      id,
    ]);
    return { ok: true, doc: res.rows[0]?.doc ?? null };
  } catch (err) {
    degrade('read', err);
    return { ok: false, doc: null };
  }
}

/** Upsert a doc. Failures degrade (memory already holds the write). */
export async function pgPutDoc(collection: string, id: string, doc: unknown): Promise<void> {
  const pool = await getPool();
  if (!pool) return;
  try {
    // Explicit JSON.stringify + ::jsonb — node-postgres would serialize a
    // top-level array as a Postgres array literal, which is invalid jsonb.
    await pool.query(
      `INSERT INTO kv_docs (collection, id, doc, updated_at)
       VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (collection, id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()`,
      [collection, id, JSON.stringify(doc)],
    );
  } catch (err) {
    degrade('write', err);
  }
}
