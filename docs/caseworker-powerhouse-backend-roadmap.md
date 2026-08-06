> **Status update (repo consolidation):** the NestJS `apps/api` referenced below was removed from the repo in this change — it lives in git history (commit `6553630` and earlier). The server-backed phases described here now target the Next.js app's own backend (`apps/web/app/api/v1` + the new storage layer).

# Caseworker Powerhouse — backend / auth roadmap (future)

**Status:** roadmap · prerequisite for any multi-user / real-PII deployment
**Companion docs:** [`caseworker-auth-plan.md`](./caseworker-auth-plan.md)

The Caseworker Powerhouse (command center + per-participant workspace + action/task
engine + DOL intelligence) ships **browser-local**: participant data lives only in
`localStorage` on the caseworker's device and never hits a server. That's the right
default until compliance signs off (see `caseworker-auth-plan.md`). This document
describes the path from there to a server-backed, multi-user agency platform.

## The seam is already in place

All UI writes go through `apps/web/lib/caseworker-repo.ts` (`CaseworkerRepo`).
Today `getRepo()` returns `localCaseworkerRepo` (a thin wrapper over the
localStorage store). Reads use the synchronous `useSyncExternalStore` hooks
(`useCaseload`, `useParticipant`). To go server-backed, implement a
`serverCaseworkerRepo` and install it with `setRepo()` after auth — **no page or
component changes required**. The granular task methods (`addTask`,
`updateTask`, `setTaskStatus`, `removeTask`) exist so the server impl can PATCH a
single task rather than PUT a whole participant.

## Build sequence

1. **Auth** (Decision 2 in `caseworker-auth-plan.md`)
   - Hosted provider (Clerk / Auth0 / Cognito / Supabase Auth) or OIDC/SSO
     (Microsoft Entra / Google Workspace) for agency customers.
   - Protect `/caseworker*` and a new `/api/v1/caseworker/*` by session,
     replacing the shared `SITE_PASSWORD` middleware for those routes.
   - Roles: `caseworker` (own caseload) vs `supervisor`/`admin` (team caseloads +
     user management). Require **MFA** for any account that can read PII.

2. **Data model** (Decision 1 — recommends server-side for multi-user)
   - `Participant` and `Task` rows in Postgres keyed to `owner_user_id`, plus a
     `participant_audit` table (who viewed/edited what, when). Build on the
     existing NestJS `users` module + Prisma (`apps/api`).
   - Mirror the current TS types: the `Participant`/`Task` shapes in
     `apps/web/lib/caseworker-store.ts` are the source of truth — keep the column
     set aligned (status/category/source/dueDate/notes/ref/completedAt).

3. **Server repo + API**
   - Implement `serverCaseworkerRepo` (fetch to `/api/v1/caseworker/*`) behind
     `getRepo()`. Keep **session-only mode** as a shared-machine option (disable
     server writes when it's on).
   - Move the read hooks to a thin cache hydrated from the API (React Query or a
     small fetch-on-mount layer) while preserving the current selector API so
     `caseworker-progress.ts` / `caseworker-nba.ts` keep working unchanged.

4. **Encryption & retention**
   - Column-level encryption for the most sensitive fields (conviction, notes,
     recovery/housing barriers) or DB-level encryption at rest; TLS already
     covers transit.
   - Configurable retention / auto-purge (e.g. N months inactive) and a hard
     "delete participant" that removes all rows and audit-logs the deletion.

5. **Compliance gate (do this before real participant data)**
   - State DOC / reentry program agreements (data-handling terms).
   - CJIS-adjacent handling if any data originates from criminal-justice systems.
   - HIPAA / BAA if recovery/treatment data comes from a covered entity.
   - Breach-notification + retention obligations vary by state.

## Rough effort

Per `caseworker-auth-plan.md`: hosted auth + route protection + roles (~3–5 days),
server-side participant/task model + access control + audit (~4–6 days),
encryption-at-rest + retention/deletion (~2–4 days), migrate client to API + QA
(~2–3 days) → **~2–3 weeks** for a production-credible v1, excluding formal
security review / pen test.

## What is intentionally NOT built yet

No backend, no auth provider, no Postgres tables, no audit log. The local build
positions for all of the above via the repo seam and the aligned `Participant`/
`Task` types — nothing more. Treat real participant data entry as a launch gate.
