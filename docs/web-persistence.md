# Web app persistence (profiles + assessment results)

The deployed product is the Next.js app at `apps/web` running on Railway with
no separate backend. Its server state — onboarding **user profiles** and
**RIASEC assessment results** — used to live only in in-process Maps pinned to
`globalThis`, which meant every redeploy (or instance restart) wiped everyone's
data.

That state now goes through a tiny KV-document storage layer,
`apps/web/lib/storage`, which persists to the Railway Postgres service when it
is attached and behaves exactly like the old in-process Maps when it is not.

## How it works

```
apps/web/lib/storage/
  index.ts     getDoc<T>(collection, id) / putDoc<T>(collection, id, doc)  — async API (server-only)
  memory.ts    globalThis-pinned Map<collection, Map<id, doc>>             — default backend + cache (client-safe)
  postgres.ts  lazy `pg` Pool, one jsonb table, graceful degradation       — active only with DATABASE_URL
```

- **No `DATABASE_URL`** → memory only. Identical to the previous behavior:
  state lives for the lifetime of the server instance and resets on redeploy.
- **With `DATABASE_URL`** → `putDoc` writes the memory store synchronously and
  then upserts Postgres; `getDoc` reads memory first and only queries Postgres
  on a miss, populating memory with what it finds (read-through cache). So a
  fresh instance after a redeploy repopulates itself from the database on
  first read.

Postgres schema — created automatically on first use
(`CREATE TABLE IF NOT EXISTS`), no migration step:

```sql
CREATE TABLE IF NOT EXISTS kv_docs (
  collection text        NOT NULL,
  id         text        NOT NULL,
  doc        jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);
```

Collections currently stored:

| Collection    | Doc                              | Written by                        | Read by                                     |
| ------------- | -------------------------------- | --------------------------------- | ------------------------------------------- |
| `profiles`    | `StoredProfile`                  | `POST /api/v1/profile`            | matches / insights pipeline (`server-data`) |
| `assessments` | RIASEC result (`AssessmentResult`) | `POST /api/v1/assessment/[userId]` | `GET /api/v1/assessment/[userId]`           |

### Failure model — a database outage never breaks a request

All Postgres errors (connect, read, write, idle-client) are caught inside
`lib/storage/postgres.ts`:

- the first error is logged once (`[storage] Postgres … failed`),
- Postgres is skipped for a 30-second cooldown, then retried,
- meanwhile the memory backend keeps serving, i.e. the app degrades to
  exactly its no-`DATABASE_URL` behavior. Writes made during an outage exist
  in memory (visible to that instance) but are not durable until the DB
  recovers and the doc is written again.

### Why the module split matters

Client pages (`app/jobs/*`) import `lib/profile-store` for its pure helpers,
so `profile-store` may only import the client-safe `lib/storage/memory` — its
synchronous `getProfile`/`saveProfile` read and write that shared memory
store. The `pg` package is referenced solely inside `lib/storage/postgres.ts`
via a dynamic `await import('pg')`, and only server code (route handlers,
`lib/server-data`) imports `lib/storage`'s async API. Net effect: `pg` never
enters a client bundle. Keep it that way when adding collections.

## Environment variables

| Variable       | Effect                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Postgres connection string. Unset → memory-only mode (today's pre-Postgres behavior).                                                                                |
| `PGSSLMODE`    | Anything except `disable` (including unset) → connect with `ssl: { rejectUnauthorized: false }`, which Railway Postgres needs (self-signed certs on both the internal host and the public TCP proxy). Set `PGSSLMODE=disable` only for a server without TLS, e.g. a plain local `docker run postgres`. |

## Railway setup

The project already has an (unused) Postgres service. To turn on persistence:

1. Open the Railway project → the **web** service → **Variables**.
2. Add a variable reference: `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`
   (pick the existing Postgres service in the reference dropdown; if the
   service has a different name, reference that name's `DATABASE_URL`).
   Using the reference keeps the private-network hostname
   (`*.railway.internal`) — no egress cost, and the table is created on the
   app's first read/write.
3. Redeploy the web service. Nothing else: no migrations, no `PGSSLMODE`
   needed on Railway (the default SSL behavior is correct there).

To verify: complete onboarding or an assessment, redeploy the web service,
and confirm the dashboard / assessment results are still there. In the
Postgres service's data tab, `SELECT collection, id, updated_at FROM kv_docs;`
shows the stored docs.

Rollback is just removing `DATABASE_URL` — the app reverts to memory-only.

## Local development

- `pnpm --filter web dev` with no env vars → memory mode, same as always.
- To exercise the Postgres path locally:

  ```bash
  docker run --rm -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16
  DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres \
  PGSSLMODE=disable pnpm --filter web dev
  ```

## Tests

`apps/web/lib/__tests__/storage.test.ts` covers the memory backend
(round-trip, collection isolation, overwrite, and the sync-write →
async-read-through contract that keeps `saveProfile` synchronous). The
Postgres backend has no automated tests — CI has no database — and is
exercised in deployment; any error there degrades to the tested memory path.
`score-agreement.test.ts` continues to lock the (now async) `matchesFor`
pipeline to the client scorer.
